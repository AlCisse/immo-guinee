//! End-to-end phone-OTP flow (W2) over the real router + Postgres/Redis (testcontainers).
//!
//! Evolution API is unconfigured in tests, so `services::notify` takes the dev
//! fallback (logs the code) — but `services::otp` still stores it in Redis under
//! `otp:code:{phone}`, which these tests read to drive the verify step.
//!
//! Routes are mounted under `/api` (see routes::router).

mod common;

use axum::http::StatusCode;
use axum::http::header::AUTHORIZATION;
use axum::http::HeaderValue;
use redis::AsyncCommands;
use serde_json::json;

use common::setup;

const PHONE: &str = "+224622000222";
const PASSWORD: &str = "Supersecret1!";

fn bearer(token: &str) -> HeaderValue {
    HeaderValue::from_str(&format!("Bearer {token}")).unwrap()
}

/// Read the OTP code stored in Redis for `phone` (delivery is the dev log fallback).
async fn otp_code(app: &common::TestApp, phone: &str) -> String {
    let mut conn = app.state.redis.clone();
    conn.get::<_, String>(format!("otp:code:{phone}"))
        .await
        .expect("an OTP code should be stored in Redis")
}

/// register auto-sends an OTP → verify with the real code → receive JWT tokens
/// → the access token authenticates `/me`.
#[tokio::test]
async fn register_then_verify_otp_issues_tokens() {
    let app = setup().await;
    let s = &app.server;

    // 1. register — auto-issues a phone-verification OTP (stored in Redis)
    s.post("/api/auth/register")
        .json(&json!({ "telephone": PHONE, "mot_de_passe": PASSWORD, "nom_complet": "Awa Diallo" }))
        .await
        .assert_status_ok();

    // 2. fetch the code the backend generated
    let code = otp_code(&app, PHONE).await;
    assert_eq!(code.len(), 6);

    // 3. verify → tokens
    let verify = s
        .post("/api/auth/otp/verify")
        .json(&json!({ "telephone": PHONE, "code": code }))
        .await;
    verify.assert_status_ok();
    let token = verify.json::<serde_json::Value>()["data"]["access_token"]
        .as_str()
        .expect("access_token")
        .to_owned();

    // 4. the issued token authenticates /me
    let me = s.get("/api/auth/me").add_header(AUTHORIZATION, bearer(&token)).await;
    me.assert_status_ok();
    assert_eq!(me.json::<serde_json::Value>()["data"]["telephone"], PHONE);

    // 5. the code is single-use: verifying it again fails (consumed on success)
    let replay = s
        .post("/api/auth/otp/verify")
        .json(&json!({ "telephone": PHONE, "code": code }))
        .await;
    replay.assert_status(StatusCode::BAD_REQUEST);
}

/// A wrong code is rejected (400); `/otp/send` is anti-enumeration for unknown
/// numbers and throttled (429) for a number that just received one at register.
#[tokio::test]
async fn wrong_code_rejected_and_send_is_guarded() {
    let app = setup().await;
    let s = &app.server;

    s.post("/api/auth/register")
        .json(&json!({ "telephone": PHONE, "mot_de_passe": PASSWORD, "nom_complet": "Awa Diallo" }))
        .await
        .assert_status_ok();

    let code = otp_code(&app, PHONE).await;
    let wrong = if code == "000000" { "111111" } else { "000000" };

    // wrong code → 400 (one failed attempt, below the 3-try block)
    s.post("/api/auth/otp/verify")
        .json(&json!({ "telephone": PHONE, "code": wrong }))
        .await
        .assert_status(StatusCode::BAD_REQUEST);

    // anti-enumeration: /otp/send for an UNREGISTERED number → 200 generic, no code stored
    let unknown = "+224622999888";
    s.post("/api/auth/otp/send")
        .json(&json!({ "telephone": unknown }))
        .await
        .assert_status_ok();
    let mut conn = app.state.redis.clone();
    let stored: bool = conn.exists(format!("otp:code:{unknown}")).await.unwrap();
    assert!(!stored, "no OTP should be issued for an unregistered number");

    // resend throttle: register already issued a code < 60 s ago → 429
    s.post("/api/auth/otp/send")
        .json(&json!({ "telephone": PHONE }))
        .await
        .assert_status(StatusCode::TOO_MANY_REQUESTS);

    // the real code still verifies (the wrong attempt didn't consume it)
    s.post("/api/auth/otp/verify")
        .json(&json!({ "telephone": PHONE, "code": code }))
        .await
        .assert_status_ok();
}
