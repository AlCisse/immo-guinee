//! ImmoGuinée — Rust backend entrypoint.
//!
//! Boots an Axum service backed by PostgreSQL (SeaORM), Redis, S3 and Vault.
//! The schema is owned by the Rust migrations (`immog-migrate`), and auth uses a
//! JWT secret loaded from Vault. See specs/001-immog-platform/ for the design.

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
    // S7 — arrêt gracieux : Docker Swarm envoie SIGTERM (PAGSTOP=10s par défaut),
    // `docker stop` pareil. On capte SIGTERM + SIGINT pour laisser Axum finir les
    // requêtes en cours et libérer proprement les connexions DB/Redis avant que le
    // runtime soit tué. Sans cela, les connexions sont brutalement fermées (erreurs
    // 502 transitoires côté Traefik, transactions DB interrompues).
    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

/// Attend SIGTERM (Docker/Swarm) ou SIGINT (Ctrl-C en dev), puis déclenche
/// l'arrêt gracieux d'Axum. La tâche renvoyée termine quand le signal est reçu.
async fn shutdown_signal() {
    use tokio::signal;

    let ctrl_c = async {
        if let Err(e) = signal::ctrl_c().await {
            tracing::error!(%e, "échec de l'écoute SIGINT");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};
        match signal(SignalKind::terminate()) {
            Ok(mut s) => {
                s.recv().await;
            }
            Err(e) => {
                tracing::error!(%e, "échec de l'écoute SIGTERM");
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("SIGINT reçu → arrêt gracieux"),
        _ = terminate => tracing::info!("SIGTERM reçu → arrêt gracieux"),
    }
}
