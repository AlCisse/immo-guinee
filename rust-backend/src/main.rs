//! ImmoGuinée — Rust backend entrypoint.
//!
//! Boots an Axum service backed by PostgreSQL (SeaORM), Redis, S3 and Vault.
//! The schema is owned by the Rust migrations (`immog-migrate`), and auth uses a
//! JWT secret loaded from Vault. See specs/001-immog-platform/ for the design.

#![allow(deprecated)] // tower-http TimeoutLayer::new deprecation (foundational scaffold)

use std::sync::Arc;

use tracing_subscriber::{EnvFilter, fmt};

use immog_backend::{config, routes, state};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env for local dev only (production secrets come from Vault).
    let _ = dotenvy::dotenv();

    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .json()
        .init();

    let cfg = config::Config::load()?;
    let bind = (cfg.host.clone(), cfg.port);

    let state = Arc::new(state::AppState::init(&cfg).await?);
    let app = routes::router(state.clone(), &cfg);

    let addr = format!("{}:{}", bind.0, bind.1);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "ImmoGuinée Rust backend listening");
    axum::serve(listener, app.into_make_service()).await?;
    Ok(())
}
