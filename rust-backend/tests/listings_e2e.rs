//! End-to-end US1 flow over the real router + Postgres/Redis/MinIO (testcontainers).
//!
//! Routes are mounted under `/api` (see routes::router).

mod common;

use std::io::Cursor;

use axum::http::HeaderValue;
use axum::http::StatusCode;
use axum::http::header::AUTHORIZATION;
use axum_test::multipart::{MultipartForm, Part};
use image::{DynamicImage, ImageFormat, RgbImage};
use serde_json::json;

use common::setup;

const PHONE: &str = "+224622000111";
const PASSWORD: &str = "Supersecret1!";

fn bearer(token: &str) -> HeaderValue {
    HeaderValue::from_str(&format!("Bearer {token}")).unwrap()
}

/// register → login → create listing → search → show (Postgres + Redis).
#[tokio::test]
async fn register_login_create_search_show_flow() {
    let app = setup().await;
    let s = &app.server;

    // register (+ verify phone — login requires FR-001 verification) → access token
    let token = app.register_verified_login(PHONE, PASSWORD).await;

    // 3. create listing
    let create = s
        .post("/api/listings")
        .add_header(AUTHORIZATION, bearer(&token))
        .json(&json!({
            "type_operation": "LOCATION",
            "type_bien": "APPARTEMENT",
            "titre": "Bel appartement 2 chambres",
            "description": "Appartement lumineux avec vue, proche des commodités et très calme.",
            "prix_gnf": 2_500_000,
            "quartier": "KALOUM",
            "caution_mois": 3
        }))
        .await;
    create.assert_status_ok();
    let created = create.json::<serde_json::Value>();
    let id = created["data"]["id"].as_str().expect("listing id").to_owned();
    assert_eq!(created["data"]["statut"], "DISPONIBLE");

    // 4. public search finds it
    let search = s.get("/api/listings/search?quartier=KALOUM").await;
    search.assert_status_ok();
    let total = search.json::<serde_json::Value>()["data"]["pagination"]["total"]
        .as_u64()
        .unwrap();
    assert!(total >= 1, "search should find the created listing");

    // 5. detail increments the view counter
    let show = s.get(&format!("/api/listings/{id}")).await;
    show.assert_status_ok();
    assert_eq!(show.json::<serde_json::Value>()["data"]["nombre_vues"], 1);

    // 6. owner edits the title (FR-013)
    let patch = s
        .patch(&format!("/api/listings/{id}"))
        .add_header(AUTHORIZATION, bearer(&token))
        .json(&json!({ "titre": "Appartement rénové 2 chambres" }))
        .await;
    patch.assert_status_ok();
    assert_eq!(
        patch.json::<serde_json::Value>()["data"]["titre"],
        "Appartement rénové 2 chambres"
    );

    // 7. owner soft-deletes → archived listing leaves the public search
    s.delete(&format!("/api/listings/{id}"))
        .add_header(AUTHORIZATION, bearer(&token))
        .await
        .assert_status_ok();
    let search2 = s.get("/api/listings/search?quartier=KALOUM").await;
    let total2 = search2.json::<serde_json::Value>()["data"]["pagination"]["total"]
        .as_u64()
        .unwrap();
    assert_eq!(total2, 0, "archived listing must not appear in public search");
}

/// Upload a photo → optimized to WebP → stored in MinIO → listing.photos updated.
#[tokio::test]
async fn upload_photo_stores_in_minio() {
    let app = setup().await;
    let s = &app.server;

    let token = app.register_verified_login(PHONE, PASSWORD).await;

    let create = s
        .post("/api/listings")
        .add_header(AUTHORIZATION, bearer(&token))
        .json(&json!({
            "type_operation": "VENTE",
            "type_bien": "VILLA",
            "titre": "Villa avec jardin",
            "description": "Grande villa familiale avec jardin arboré et garage deux places.",
            "prix_gnf": 900_000_000,
            "quartier": "RATOMA"
        }))
        .await;
    create.assert_status_ok();
    let id = create.json::<serde_json::Value>()["data"]["id"].as_str().unwrap().to_owned();

    // A small but real PNG.
    let mut png = Cursor::new(Vec::new());
    DynamicImage::ImageRgb8(RgbImage::new(64, 48)).write_to(&mut png, ImageFormat::Png).unwrap();

    let form = MultipartForm::new().add_part(
        "photo",
        Part::bytes(png.into_inner()).file_name("photo.png").mime_type("image/png"),
    );

    let upload = s
        .post(&format!("/api/listings/{id}/photos"))
        .add_header(AUTHORIZATION, bearer(&token))
        .multipart(form)
        .await;
    upload.assert_status_ok();

    let body = upload.json::<serde_json::Value>();
    assert_eq!(body["data"]["count"], 1);
    let first = &body["data"]["photos"][0];
    // Three renditions, each a MinIO URL.
    for label in ["thumbnail", "medium", "large"] {
        let url = first[label].as_str().expect("rendition url");
        assert!(url.contains("immoguinee-images/listings/"), "unexpected url: {url}");
        assert!(url.ends_with(".webp"));
    }
}

/// `/me` returns the profile; `/logout` revokes the token so `/me` then fails.
#[tokio::test]
async fn me_and_logout_revoke_token() {
    let app = setup().await;
    let s = &app.server;

    let token = app.register_verified_login(PHONE, PASSWORD).await;

    // /me works with a valid token
    let me = s.get("/api/auth/me").add_header(AUTHORIZATION, bearer(&token)).await;
    me.assert_status_ok();
    assert_eq!(me.json::<serde_json::Value>()["data"]["telephone"], PHONE);

    // PATCH /me updates profile + notification preferences (FR-005)
    let patch = s
        .patch("/api/auth/me")
        .add_header(AUTHORIZATION, bearer(&token))
        .json(&json!({ "nom_complet": "Awa D.", "notifications": { "whatsapp": true } }))
        .await;
    patch.assert_status_ok();
    let pv = patch.json::<serde_json::Value>();
    assert_eq!(pv["data"]["nom_complet"], "Awa D.");
    assert_eq!(pv["data"]["preferences_notification"]["whatsapp"], true);
    assert_eq!(pv["data"]["preferences_notification"]["sms"], true); // unchanged default

    // logout revokes the token
    s.post("/api/auth/logout")
        .add_header(AUTHORIZATION, bearer(&token))
        .await
        .assert_status_ok();

    // /me is now rejected (token in the deny-list)
    let me2 = s.get("/api/auth/me").add_header(AUTHORIZATION, bearer(&token)).await;
    me2.assert_status(StatusCode::UNAUTHORIZED);
}
