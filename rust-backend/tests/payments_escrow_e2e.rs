//! End-to-end money/escrow critical flows over the real router + Postgres/Redis/MinIO
//! (testcontainers). These cover the security/money fixes that the unit suite cannot
//! exercise (no DB/Redis): the atomic double-release guard on `validate`, the
//! refund-as-mediation RBAC + idempotency, the per-contract sign mutex (lost-update),
//! the one-active-payment invariant, and that `process` commits a payment AND a
//! transaction row together.
//!
//! Evolution API is unconfigured in the dev test config (vault_addr empty) so the
//! notifier takes the dev log fallback; the sign OTP is read straight from Redis
//! (`otp:code:contract:{contract_id}:{phone}`).

mod common;

use axum::http::HeaderValue;
use axum::http::StatusCode;
use axum::http::header::AUTHORIZATION;
use redis::AsyncCommands;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use serde_json::json;

use common::setup;
use immog_backend::db::entities::{payment, transaction, user};

const OWNER_PHONE: &str = "+224622000301";
const TENANT_PHONE: &str = "+224622000302";
const PASSWORD: &str = "Supersecret1!";

fn bearer(token: &str) -> HeaderValue {
    HeaderValue::from_str(&format!("Bearer {token}")).unwrap()
}

fn auth(token: &str) -> HeaderValue {
    bearer(token)
}

/// Install a tracing subscriber so server-side `tracing::error!` (the real cause
/// behind a generic 500 "Erreur interne") is printed to the test harness stderr.
/// `try_init` no-ops if a global subscriber is already installed (parallel tests).
fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::new("error"))
        .with_test_writer()
        .try_init();
}

/// register + login → access token (the user is `Actif`, role derived from type).
async fn register_login(app: &common::TestApp, phone: &str) -> String {
    app.register_verified_login(phone, PASSWORD).await
}

/// The authenticated user's id.
async fn user_id(s: &axum_test::TestServer, token: &str) -> uuid::Uuid {
    let me = s.get("/api/auth/me").add_header(AUTHORIZATION, auth(token)).await;
    me.assert_status_ok();
    me.json::<serde_json::Value>()["data"]["id"]
        .as_str()
        .expect("user id")
        .parse()
        .expect("uuid")
}

/// Read the contract-scoped sign OTP stored in Redis for `phone`.
async fn sign_otp(app: &common::TestApp, contract_id: uuid::Uuid, phone: &str) -> String {
    let mut conn = app.state.redis.clone();
    conn.get::<_, String>(format!("otp:code:contract:{contract_id}:{phone}"))
        .await
        .expect("a sign OTP should be stored in Redis")
}

/// Owner creates a listing → returns its id.
async fn create_listing(s: &axum_test::TestServer, owner_token: &str) -> uuid::Uuid {
    let r = s
        .post("/api/listings")
        .add_header(AUTHORIZATION, auth(owner_token))
        .json(&json!({
            "type_operation": "LOCATION",
            "type_bien": "APPARTEMENT",
            "titre": "Appartement test",
            "description": "Appartement pour tests d'integration escrow.",
            "prix_gnf": 100_000,
            "quartier": "KALOUM",
            "caution_mois": 1
        }))
        .await;
    r.assert_status_ok();
    r.json::<serde_json::Value>()["data"]["id"]
        .as_str()
        .expect("listing id")
        .parse()
        .expect("uuid")
}

/// Owner generates a lease contract for `tenant_id` on `listing_id` → its id.
async fn create_contract(
    s: &axum_test::TestServer,
    owner_token: &str,
    listing_id: uuid::Uuid,
    tenant_id: uuid::Uuid,
) -> uuid::Uuid {
    let r = s
        .post("/api/contracts")
        .add_header(AUTHORIZATION, auth(owner_token))
        .json(&json!({
            "listing_id": listing_id,
            "locataire_id": tenant_id,
            "type_contrat": "location",
            "date_debut": "2025-01-01",
            "montant_loyer": 100_000,
            "montant_caution": 0,
        }))
        .await;
    r.assert_status_ok();
    r.json::<serde_json::Value>()["data"]["contract"]["id"]
        .as_str()
        .expect("contract id")
        .parse()
        .expect("uuid")
}

/// Owner sends the contract for signature (→ EnAttenteSignature).
async fn send_contract(s: &axum_test::TestServer, owner_token: &str, contract_id: uuid::Uuid) {
    let r = s
        .post(&format!("/api/contracts/{contract_id}/send"))
        .add_header(AUTHORIZATION, auth(owner_token))
        .await;
    r.assert_status_ok();
}

/// One party requests the sign OTP, then signs with it.
async fn sign(
    app: &common::TestApp,
    s: &axum_test::TestServer,
    token: &str,
    phone: &str,
    contract_id: uuid::Uuid,
) {
    s.post(&format!("/api/contracts/{contract_id}/sign/request-otp"))
        .add_header(AUTHORIZATION, auth(token))
        .await
        .assert_status_ok();
    let code = sign_otp(app, contract_id, phone).await;
    let r = s
        .post(&format!("/api/contracts/{contract_id}/sign"))
        .add_header(AUTHORIZATION, auth(token))
        .json(&json!({ "otp": code }))
        .await;
    r.assert_status_ok();
}

/// Tenant pays the signed contract → payment id (EnEscrow). Amount kept < 500 000 GNF
/// so no 2FA is required (the tenant has no 2FA secret).
async fn pay(s: &axum_test::TestServer, tenant_token: &str, contract_id: uuid::Uuid) -> uuid::Uuid {
    let r = s
        .post("/api/payments")
        .add_header(AUTHORIZATION, auth(tenant_token))
        .json(&json!({ "contract_id": contract_id, "methode_paiement": "ORANGE_MONEY" }))
        .await;
    r.assert_status_ok();
    r.json::<serde_json::Value>()["data"]["payment"]["id"]
        .as_str()
        .expect("payment id")
        .parse()
        .expect("uuid")
}

/// Seed a fully signed contract (Brouillon → send → both sign → SigneArchive), NOT
/// yet paid: returns (owner_token, tenant_token, contract_id).
async fn seed_signed_contract(app: &common::TestApp) -> (String, String, uuid::Uuid) {
    init_tracing();
    let s = &app.server;
    let owner_token = register_login(&app, OWNER_PHONE).await;
    let tenant_token = register_login(&app, TENANT_PHONE).await;
    let owner_id = user_id(s, &owner_token).await;
    let tenant_id = user_id(s, &tenant_token).await;
    assert_ne!(owner_id, tenant_id);
    let listing_id = create_listing(s, &owner_token).await;
    let contract_id = create_contract(s, &owner_token, listing_id, tenant_id).await;
    send_contract(s, &owner_token, contract_id).await;
    sign(app, s, &owner_token, OWNER_PHONE, contract_id).await;
    sign(app, s, &tenant_token, TENANT_PHONE, contract_id).await;
    (owner_token, tenant_token, contract_id)
}

/// Seed a fully signed + paid contract: returns (owner_token, tenant_token, payment_id).
async fn seed_paid_contract(app: &common::TestApp) -> (String, String, uuid::Uuid) {
    let (owner_token, tenant_token, contract_id) = seed_signed_contract(app).await;
    let payment_id = pay(&app.server, &tenant_token, contract_id).await;
    (owner_token, tenant_token, payment_id)
}

/// Promote the user `phone` to staff `admin` (DB override) and re-login so the new
/// token carries the admin role (ResolveDisputes).
async fn promote_admin(app: &common::TestApp, phone: &str) -> String {
    let u = user::Entity::find()
        .filter(user::Column::Telephone.eq(phone))
        .one(&app.state.db)
        .await
        .expect("find user")
        .expect("user exists");
    let mut am: user::ActiveModel = u.into();
    am.role = Set(Some("admin".into()));
    am.update(&app.state.db).await.expect("promote");
    // Re-login → fresh token with role = admin.
    let login = app
        .server
        .post("/api/auth/login")
        .json(&json!({ "telephone": phone, "mot_de_passe": PASSWORD }))
        .await;
    login.assert_status_ok();
    login.json::<serde_json::Value>()["data"]["access_token"]
        .as_str()
        .expect("admin access_token")
        .to_owned()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Two concurrent `validate` on the same escrowed payment: exactly one wins (200 +
/// quittance), the other is rejected (409). No double-release of the deposit.
#[tokio::test]
async fn escrow_double_release_is_atomic() {
    let app = setup().await;
    let s = &app.server;
    let (owner_token, _tenant_token, payment_id) = seed_paid_contract(&app).await;

    let call = || async {
        s.post(&format!("/api/payments/{payment_id}/validate"))
            .add_header(AUTHORIZATION, auth(&owner_token))
            .json(&json!({ "validated": true }))
            .await
    };
    let (r1, r2) = tokio::join!(call(), call());
    let c1 = r1.status_code();
    let c2 = r2.status_code();

    let mut ok = 0u32;
    let mut conflict = 0u32;
    for c in [c1, c2] {
        match c {
            StatusCode::OK => ok += 1,
            StatusCode::CONFLICT => conflict += 1,
            other => panic!("unexpected validate status: {other}"),
        }
    }
    assert_eq!(ok, 1, "exactly one validate must succeed (got {ok} ok, {conflict} 409)");
    assert_eq!(conflict, 1, "the concurrent validate must be rejected as 409");

    // The winning validate released the escrow: the payment is now Confirme.
    let p = payment::Entity::find_by_id(payment_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    use immog_backend::db::entities::sea_orm_active_enums::StatutPaiement;
    assert_eq!(p.statut, StatutPaiement::Confirme, "escrow must be released exactly once");
    assert!(p.quittance_pdf_url.is_some(), "the winner must issue a quittance PDF");
    assert!(p.date_deblocage_escrow.is_some(), "escrow release timestamp set");
}

/// Refund is a mediation action: a party (payer or beneficiary) is forbidden (403),
/// an admin (ResolveDisputes) may refund (200), and a second refund is idempotent
/// (409 — the payment is no longer escrowed).
#[tokio::test]
async fn refund_is_admin_mediation() {
    let app = setup().await;
    let s = &app.server;
    let (owner_token, tenant_token, payment_id) = seed_paid_contract(&app).await;

    // A party (tenant / payer) cannot self-refund.
    let r = s
        .post(&format!("/api/payments/{payment_id}/refund"))
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .json(&json!({ "reason": "test" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::FORBIDDEN, "payer must not refund");

    // The beneficiary (owner) cannot self-refund either.
    let r = s
        .post(&format!("/api/payments/{payment_id}/refund"))
        .add_header(AUTHORIZATION, auth(&owner_token))
        .json(&json!({ "reason": "test" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::FORBIDDEN, "beneficiary must not refund");

    // Promote the owner to admin and refund.
    let admin_token = promote_admin(&app, OWNER_PHONE).await;
    let r = s
        .post(&format!("/api/payments/{payment_id}/refund"))
        .add_header(AUTHORIZATION, auth(&admin_token))
        .json(&json!({ "reason": "litige résolu" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::OK, "admin refund must succeed");

    use immog_backend::db::entities::sea_orm_active_enums::StatutPaiement;
    let p = payment::Entity::find_by_id(payment_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    assert_eq!(p.statut, StatutPaiement::Rembourse, "payment is refunded");

    // H3: refund also closes the escrow transaction (Annulee), not just the payment.
    use immog_backend::db::entities::sea_orm_active_enums::StatutTransaction;
    let cid = p.contrat_id.expect("contract id");
    let t = transaction::Entity::find()
        .filter(transaction::Column::ContratId.eq(cid))
        .one(&app.state.db)
        .await
        .expect("query transaction")
        .expect("escrow transaction exists");
    assert_eq!(t.statut, StatutTransaction::Annulee, "refund must cancel the escrow transaction");

    // A second refund is rejected (the payment is no longer escrowed).
    let r = s
        .post(&format!("/api/payments/{payment_id}/refund"))
        .add_header(AUTHORIZATION, auth(&admin_token))
        .json(&json!({ "reason": "again" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::CONFLICT, "double refund must be a 409");
}

/// Two parties signing concurrently: the per-contract mutex serializes the
/// read-modify-write so neither signature is lost — the contract ends SigneArchive
/// with both signatures present. (Without the mutex this would flake as a lost
/// update leaving the contract in PartiellementSigne.)
#[tokio::test]
async fn concurrent_sign_preserves_both_signatures() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let owner_token = register_login(&app, OWNER_PHONE).await;
    let tenant_token = register_login(&app, TENANT_PHONE).await;
    let tenant_id = user_id(s, &tenant_token).await;
    let listing_id = create_listing(s, &owner_token).await;
    let contract_id = create_contract(s, &owner_token, listing_id, tenant_id).await;
    send_contract(s, &owner_token, contract_id).await;

    // Both parties request their OTP first (throttled at 60s, so request them
    // sequentially before the concurrent signs).
    s.post(&format!("/api/contracts/{contract_id}/sign/request-otp"))
        .add_header(AUTHORIZATION, auth(&owner_token))
        .await
        .assert_status_ok();
    s.post(&format!("/api/contracts/{contract_id}/sign/request-otp"))
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .await
        .assert_status_ok();
    let owner_code = sign_otp(&app, contract_id, OWNER_PHONE).await;
    let tenant_code = sign_otp(&app, contract_id, TENANT_PHONE).await;

    // Fire both signs concurrently. The per-contract mutex serializes them: one
    // wins (200), the other is rejected with 409 ("signature in progress"). The
    // loser's OTP was NOT consumed (verify runs inside the lock), so it can retry
    // once the winner has released. A real client retries with backoff — this loop
    // models that, and asserts the invariant the mutex protects: both signatures
    // are ultimately recorded (no lost update leaving the contract partially signed).
    let do_sign = |token: String, code: String| async move {
        s.post(&format!("/api/contracts/{contract_id}/sign"))
            .add_header(AUTHORIZATION, auth(&token))
            .json(&json!({ "otp": code }))
            .await
            .status_code()
    };
    let (mut s1, mut s2) = tokio::join!(
        do_sign(owner_token.clone(), owner_code.clone()),
        do_sign(tenant_token.clone(), tenant_code.clone()),
    );

    // Retry the loser (the one that got 409) until the lock is free. Bounded: the
    // winner holds the lock only for the Typst render + S3 put + DB update (~1s).
    for _ in 0..20 {
        if s1 == StatusCode::OK && s2 == StatusCode::OK {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
        if s1 == StatusCode::CONFLICT {
            s1 = do_sign(owner_token.clone(), owner_code.clone()).await;
        }
        if s2 == StatusCode::CONFLICT {
            s2 = do_sign(tenant_token.clone(), tenant_code.clone()).await;
        }
    }
    assert_eq!(s1, StatusCode::OK, "owner sign must ultimately succeed");
    assert_eq!(s2, StatusCode::OK, "tenant sign must ultimately succeed");

    // The contract is sealed with both signatures — no lost update.
    use immog_backend::db::entities::sea_orm_active_enums::StatutContrat;
    let c = immog_backend::db::entities::contract::Entity::find_by_id(contract_id)
        .one(&app.state.db)
        .await
        .expect("find contract")
        .expect("contract exists");
    assert_eq!(c.statut, StatutContrat::SigneArchive, "both signatures must seal the contract");
    let n = c.signatures.as_array().map(|a| a.len()).unwrap_or(0);
    assert_eq!(n, 2, "both signatures must be recorded (got {n})");
}

/// `process` commits the payment AND its escrow transaction together (H1): a payment
/// in EnEscrow always has a matching EnCours transaction row.
#[tokio::test]
async fn process_creates_payment_and_transaction_atomically() {
    let app = setup().await;
    let (_owner_token, _tenant_token, payment_id) = seed_paid_contract(&app).await;

    let p = payment::Entity::find_by_id(payment_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    let cid = p.contrat_id.expect("payment has a contract");

    // The escrow transaction was committed in the same atomic unit as the payment.
    let t = transaction::Entity::find()
        .filter(transaction::Column::ContratId.eq(cid))
        .one(&app.state.db)
        .await
        .expect("query transaction")
        .expect("an escrow transaction row must exist for the payment");
    use immog_backend::db::entities::sea_orm_active_enums::StatutTransaction;
    assert_eq!(t.statut, StatutTransaction::EnCours, "transaction is in progress (escrow)");
    assert_eq!(t.paiements_ids, json!([payment_id]), "transaction references the payment");

    // No orphan payments: count payments for the contract == 1 (no double-pay).
    let count = payment::Entity::find()
        .filter(payment::Column::ContratId.eq(cid))
        .count(&app.state.db)
        .await
        .expect("count payments");
    assert_eq!(count, 1, "exactly one active payment per contract");
}

/// A second payment on the same signed contract is rejected (one-active-payment
/// invariant, shared by `process` and `cash`). Cash is owner-only (H2): a tenant
/// calling cash gets 403; the owner calling cash over an active payment gets 409.
#[tokio::test]
async fn one_active_payment_per_contract() {
    let app = setup().await;
    let s = &app.server;
    let (owner_token, tenant_token, payment_id) = seed_paid_contract(&app).await;

    // Re-pay with mobile money → 409 (an active payment already exists).
    let r = s
        .post("/api/payments")
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .json(&json!({ "contract_id": payment_contract(&app, payment_id).await, "methode_paiement": "MTN_MOMO" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::CONFLICT, "second mobile payment must be rejected");

    // Cash is owner-only: the tenant calling it is forbidden (403), not conflicted.
    let r = s
        .post("/api/payments/cash")
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .json(&json!({ "contract_id": payment_contract(&app, payment_id).await, "methode_paiement": "ESPECES" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::FORBIDDEN, "tenant must not record cash (owner-only)");

    // The owner calling cash over an already-escrowed contract → 409 (active payment).
    let r = s
        .post("/api/payments/cash")
        .add_header(AUTHORIZATION, auth(&owner_token))
        .json(&json!({ "contract_id": payment_contract(&app, payment_id).await, "methode_paiement": "ESPECES" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::CONFLICT, "owner cash over an active payment must be rejected");
}

/// Resolve the contract id behind a payment (helper for the test above).
async fn payment_contract(app: &common::TestApp, payment_id: uuid::Uuid) -> uuid::Uuid {
    let p = payment::Entity::find_by_id(payment_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    p.contrat_id.expect("contract id")
}

/// H2: cash recorded by the OWNER on a fresh signed contract (no prior escrow) →
/// 200, payment Confirme immediately (no escrow), and a completed transaction row.
/// A tenant calling cash on the same fresh contract is forbidden (owner-only).
#[tokio::test]
async fn cash_by_owner_on_fresh_contract_succeeds() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let (owner_token, tenant_token, contract_id) = seed_signed_contract(&app).await;

    // Tenant cannot record cash (owner-only).
    let r = s
        .post("/api/payments/cash")
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .json(&json!({ "contract_id": contract_id, "methode_paiement": "ESPECES" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::FORBIDDEN, "tenant cash must be forbidden");

    // Owner records the cash payment.
    let r = s
        .post("/api/payments/cash")
        .add_header(AUTHORIZATION, auth(&owner_token))
        .json(&json!({ "contract_id": contract_id, "methode_paiement": "ESPECES" }))
        .await;
    assert_eq!(r.status_code(), StatusCode::OK, "owner cash on a fresh contract must succeed");

    let pay_id = r.json::<serde_json::Value>()["data"]["payment"]["id"]
        .as_str()
        .expect("payment id")
        .parse::<uuid::Uuid>()
        .expect("uuid");
    use immog_backend::db::entities::sea_orm_active_enums::{StatutPaiement, StatutTransaction};
    let p = payment::Entity::find_by_id(pay_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    assert_eq!(p.statut, StatutPaiement::Confirme, "cash payment is confirmed immediately (no escrow)");

    let t = transaction::Entity::find()
        .filter(transaction::Column::ContratId.eq(contract_id))
        .one(&app.state.db)
        .await
        .expect("query transaction")
        .expect("cash creates a transaction row");
    assert_eq!(t.statut, StatutTransaction::Completee, "cash transaction is completed");
    assert_eq!(t.paiements_ids, json!([pay_id]), "transaction references the cash payment");
}

/// H5: a signed (SigneArchive) contract cannot be re-sent. `send` is guarded so the
/// owner cannot rewrite it to EnAttenteSignature (resetting the retraction deadline)
/// and then `cancel` it to unseal/destroy a legally signed lease.
#[tokio::test]
async fn send_rejected_for_signed_contract() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let (owner_token, _tenant_token, contract_id) = seed_signed_contract(&app).await;

    let r = s
        .post(&format!("/api/contracts/{contract_id}/send"))
        .add_header(AUTHORIZATION, auth(&owner_token))
        .await;
    assert_eq!(r.status_code(), StatusCode::CONFLICT, "re-sending a signed contract must be 409");
}

/// H7: two concurrent contract creates on the same listing — the partial-unique
/// index uq_contracts_annonce_active rejects the loser with 409. The app-level
/// "one active contract per listing" check is a check-then-insert TOCTOU (the
/// window spans the Typst render + S3 put); the DB index is the real guard.
#[tokio::test]
async fn one_active_contract_per_listing_concurrent() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let owner_token = register_login(&app, OWNER_PHONE).await;
    let tenant_token = register_login(&app, TENANT_PHONE).await;
    let tenant_id = user_id(s, &tenant_token).await;
    let listing_id = create_listing(s, &owner_token).await;

    let body = json!({
        "listing_id": listing_id,
        "locataire_id": tenant_id,
        "type_contrat": "location",
        "date_debut": "2025-01-01",
        "montant_loyer": 100_000,
        "montant_caution": 0,
    });
    let do_create = || async {
        s.post("/api/contracts")
            .add_header(AUTHORIZATION, auth(&owner_token))
            .json(&body)
            .await
            .status_code()
    };
    let (r1, r2) = tokio::join!(do_create(), do_create());

    let mut ok = 0u32;
    let mut conflict = 0u32;
    for c in [r1, r2] {
        match c {
            StatusCode::OK => ok += 1,
            StatusCode::CONFLICT => conflict += 1,
            other => panic!("unexpected contract create status: {other}"),
        }
    }
    assert_eq!(ok, 1, "exactly one concurrent create must win (got {ok} ok, {conflict} 409)");
    assert_eq!(conflict, 1, "the concurrent create must be rejected as 409");
}

// ---------------------------------------------------------------------------
// Concurrency (H4) — the prior one_active_payment test is sequential and misses
// the cash+cash / process+cash races. These fire the requests together; the
// partial-unique index uq_payments_contrat_active must serialise them.
// ---------------------------------------------------------------------------

/// Two OWNER cash records fired at once on the same fresh signed contract →
/// exactly one 200 and one 409, and a single active payment persists.
#[tokio::test]
async fn cash_plus_cash_concurrent_one_wins() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let (owner_token, _tenant_token, contract_id) = seed_signed_contract(&app).await;

    let call = || async {
        s.post("/api/payments/cash")
            .add_header(AUTHORIZATION, auth(&owner_token))
            .json(&json!({ "contract_id": contract_id, "methode_paiement": "ESPECES" }))
            .await
            .status_code()
    };
    let (c1, c2) = tokio::join!(call(), call());
    assert_status_race(c1, c2, "cash+cash");
    assert_single_active_payment(&app, contract_id).await;
}

/// A tenant mobile-money `process` and an owner `cash` fired at once on the same
/// contract → exactly one 200 and one 409, and a single active payment.
#[tokio::test]
async fn process_plus_cash_concurrent_one_wins() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let (owner_token, tenant_token, contract_id) = seed_signed_contract(&app).await;

    let process = || async {
        s.post("/api/payments")
            .add_header(AUTHORIZATION, auth(&tenant_token))
            .json(&json!({ "contract_id": contract_id, "methode_paiement": "ORANGE_MONEY" }))
            .await
            .status_code()
    };
    let cash = || async {
        s.post("/api/payments/cash")
            .add_header(AUTHORIZATION, auth(&owner_token))
            .json(&json!({ "contract_id": contract_id, "methode_paiement": "ESPECES" }))
            .await
            .status_code()
    };
    let (c1, c2) = tokio::join!(process(), cash());
    assert_status_race(c1, c2, "process+cash");
    assert_single_active_payment(&app, contract_id).await;
}

/// FR-001 (M-a): login refuses tokens to an unverified phone — it re-issues the OTP
/// and returns a verify_otp action. After verification, login yields tokens.
#[tokio::test]
async fn login_requires_verified_phone() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    s.post("/api/auth/register")
        .json(&json!({ "telephone": OWNER_PHONE, "mot_de_passe": PASSWORD, "nom_complet": "Test User" }))
        .await
        .assert_status_ok();

    // Unverified → no token, action = verify_otp.
    let r = s
        .post("/api/auth/login")
        .json(&json!({ "telephone": OWNER_PHONE, "mot_de_passe": PASSWORD }))
        .await;
    r.assert_status_ok();
    let body = r.json::<serde_json::Value>();
    assert_eq!(body["data"]["action"], "verify_otp", "unverified login must ask for OTP");
    assert!(body["data"]["access_token"].is_null(), "no token for an unverified phone");

    // After verification, login yields tokens.
    app.mark_phone_verified(OWNER_PHONE).await;
    let r = s
        .post("/api/auth/login")
        .json(&json!({ "telephone": OWNER_PHONE, "mot_de_passe": PASSWORD }))
        .await;
    r.assert_status_ok();
    assert!(
        r.json::<serde_json::Value>()["data"]["access_token"].is_string(),
        "verified login must yield a token"
    );
}

/// M-c: the tenant may retract a signed contract within the 48h window when no
/// payment is active.
#[tokio::test]
async fn tenant_retraction_within_window() {
    init_tracing();
    let app = setup().await;
    let (_owner_token, tenant_token, contract_id) = seed_signed_contract(&app).await;
    let s = &app.server;

    let r = s
        .post(&format!("/api/contracts/{contract_id}/cancel"))
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .json(&json!({}))
        .await;
    assert_eq!(r.status_code(), StatusCode::OK, "tenant retraction within window must succeed");
    assert_eq!(r.json::<serde_json::Value>()["data"]["retraction"], true);
}

/// M-c: retraction is refused once an escrow payment exists (must go via mediation).
#[tokio::test]
async fn retraction_blocked_with_active_payment() {
    init_tracing();
    let app = setup().await;
    let (_owner_token, tenant_token, contract_id) = seed_signed_contract(&app).await;
    let s = &app.server;
    let _pay_id = pay(s, &tenant_token, contract_id).await; // escrow now active

    let r = s
        .post(&format!("/api/contracts/{contract_id}/cancel"))
        .add_header(AUTHORIZATION, auth(&tenant_token))
        .json(&json!({}))
        .await;
    assert_eq!(
        r.status_code(),
        StatusCode::CONFLICT,
        "retraction with an active payment must be refused (→ mediation)"
    );
}

// --- concurrency assertion helpers ---

fn assert_status_race(c1: StatusCode, c2: StatusCode, label: &str) {
    let mut ok = 0u32;
    let mut conflict = 0u32;
    for c in [c1, c2] {
        match c {
            StatusCode::OK => ok += 1,
            StatusCode::CONFLICT => conflict += 1,
            other => panic!("{label}: unexpected status {other}"),
        }
    }
    assert_eq!(ok, 1, "{label}: exactly one must win (got {ok} ok, {conflict} 409)");
    assert_eq!(conflict, 1, "{label}: the loser must be 409");
}

async fn assert_single_active_payment(app: &common::TestApp, contract_id: uuid::Uuid) {
    use immog_backend::db::entities::sea_orm_active_enums::StatutPaiement;
    let payments = payment::Entity::find()
        .filter(payment::Column::ContratId.eq(contract_id))
        .all(&app.state.db)
        .await
        .expect("query payments");
    let active = payments
        .iter()
        .filter(|p| !matches!(p.statut, StatutPaiement::Echoue | StatutPaiement::Rembourse))
        .count();
    assert_eq!(active, 1, "exactly one active payment must persist after the race");
}

/// H1 (fault injection): the quittance S3 put fails during `validate`. Because the
/// render+put happens BEFORE the atomic flip, the payment must stay EnEscrow (no
/// quittance, no release) and the operation is retryable — a retry after recovery
/// releases the escrow exactly once. Uses the storage fault-injection hook.
#[tokio::test]
async fn validate_keeps_escrow_when_quittance_put_fails() {
    init_tracing();
    let app = setup().await;
    let s = &app.server;
    let (owner_token, _tenant_token, payment_id) = seed_paid_contract(&app).await;
    use immog_backend::db::entities::sea_orm_active_enums::StatutPaiement;

    // Inject an S3 put failure → validate must error and leave escrow intact.
    app.state.storage.set_fail_puts(true);
    let r = s
        .post(&format!("/api/payments/{payment_id}/validate"))
        .add_header(AUTHORIZATION, auth(&owner_token))
        .json(&json!({ "validated": true }))
        .await;
    assert_eq!(
        r.status_code(),
        StatusCode::INTERNAL_SERVER_ERROR,
        "a failed quittance persist must surface as 500"
    );

    let p = payment::Entity::find_by_id(payment_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    assert_eq!(p.statut, StatutPaiement::EnEscrow, "escrow must remain after a failed validate");
    assert!(p.quittance_pdf_url.is_none(), "no quittance is persisted on failure");
    assert!(p.date_deblocage_escrow.is_none(), "escrow was not released");

    // Recover → retry validate succeeds and releases the escrow exactly once.
    app.state.storage.set_fail_puts(false);
    let r = s
        .post(&format!("/api/payments/{payment_id}/validate"))
        .add_header(AUTHORIZATION, auth(&owner_token))
        .json(&json!({ "validated": true }))
        .await;
    r.assert_status_ok();

    let p = payment::Entity::find_by_id(payment_id)
        .one(&app.state.db)
        .await
        .expect("find payment")
        .expect("payment exists");
    assert_eq!(p.statut, StatutPaiement::Confirme, "retry after recovery releases escrow");
    assert!(p.quittance_pdf_url.is_some(), "the successful retry persists a quittance");
}