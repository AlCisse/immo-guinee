//! End-to-end US1 flow over the real router + Postgres/Redis/MinIO (testcontainers).
//!
//! Routes are mounted under `/api` (see routes::router).

mod common;

use std::io::Cursor;

use axum::http::HeaderValue;
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

    // 1. register
    let reg = s
        .post("/api/auth/register")
        .json(&json!({ "telephone": PHONE, "mot_de_passe": PASSWORD, "nom_complet": "Awa Diallo" }))
        .await;
    reg.assert_status_ok();

    // 2. login → access token
    let login = s
        .post("/api/auth/login")
        .json(&json!({ "telephone": PHONE, "mot_de_passe": PASSWORD }))
        .await;
    login.assert_status_ok();
    let token = login.json::<serde_json::Value>()["data"]["access_token"]
        .as_str()
        .expect("access_token")
        .to_owned();

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
}

/// Upload a photo → optimized to WebP → stored in MinIO → listing.photos updated.
#[tokio::test]
async fn upload_photo_stores_in_minio() {
    let app = setup().await;
    let s = &app.server;

    s.post("/api/auth/register")
        .json(&json!({ "telephone": PHONE, "mot_de_passe": PASSWORD, "nom_complet": "Awa Diallo" }))
        .await
        .assert_status_ok();
    let login = s
        .post("/api/auth/login")
        .json(&json!({ "telephone": PHONE, "mot_de_passe": PASSWORD }))
        .await;
    let token = login.json::<serde_json::Value>()["data"]["access_token"]
        .as_str()
        .unwrap()
        .to_owned();

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
