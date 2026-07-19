//! Application state — the "service container" (replaces Laravel DI / facades).
//!
//! All shared dependencies are constructed once at boot and passed to handlers
//! via `axum::extract::State<Arc<AppState>>`. No global facades; everything
//! explicit. This is the Rust idiom and is cleaner than Laravel's container.

use std::sync::Arc;

use redis::aio::ConnectionManager;
use sea_orm::DatabaseConnection;

use crate::config::Config;
use crate::error::AppResult;
use crate::services::storage::S3Storage;
use crate::services::whatsapp::WhatsAppClient;

/// Holds long-lived, shareable dependencies.
pub struct AppState {
    pub db: DatabaseConnection,
    pub redis: ConnectionManager,
    pub cfg: Config,
    /// JWT signing/verification key (fetched from Vault in prod, env in dev).
    pub jwt_secret: Vec<u8>,
    /// S3-compatible object storage (listing photos, documents).
    pub storage: S3Storage,
    /// WhatsApp sender (Evolution API).
    pub whatsapp: WhatsAppClient,
    // Filled in later phases: vault_client, notifier, queue, ...
}

impl AppState {
    pub async fn init(cfg: &Config) -> AppResult<Self> {
        let db = sea_orm::Database::connect(&cfg.database_url)
            .await
            .map_err(|e| crate::error::AppError::Internal(anyhow::anyhow!("DB connect: {e}")))?;

        let redis_client = redis::Client::open(cfg.redis_url.as_str())
            .map_err(|e| crate::error::AppError::Internal(anyhow::anyhow!("Redis open: {e}")))?;
        let redis = redis_client
            .get_connection_manager()
            .await
            .map_err(|e| crate::error::AppError::Internal(anyhow::anyhow!("Redis manager: {e}")))?;

        // In production the JWT secret (and all other secrets) come from Vault
        // (secret/immoguinee/app -> jwt_secret). For local dev we fall back to a
        // value from IMMOG_JWT_SECRET env or a dev-only constant.
        let jwt_secret = load_jwt_secret(cfg).await?;

        let storage = S3Storage::from_config(cfg)?;
        let whatsapp = WhatsAppClient::from_config(cfg);

        Ok(Self {
            db,
            redis,
            cfg: cfg.clone(),
            jwt_secret,
            storage,
            whatsapp,
        })
    }
}

/// Load the JWT secret from Vault (secret/immoguinee/app -> jwt_secret) in prod,
/// or from `IMMOG_JWT_SECRET` / a dev-only constant locally.
///
/// The `vaultrs` AppRole wiring lands in the Vault section. For now, dev fallback.
async fn load_jwt_secret(cfg: &Config) -> AppResult<Vec<u8>> {
    if !cfg.vault_addr.is_empty() && !cfg.vault_approle_role_id.is_empty() {
        // TODO (Phase 0): authenticate via AppRole (secret_id from
        // /run/secrets/vault_approle_secret_id), read KV cfg.jwt_secret_vault_path,
        // return the `jwt_secret` field. See contracts/secrets.md.
        tracing::warn!("Vault configured but client not yet wired — using env/dev fallback for JWT secret");
    }
    let from_env = std::env::var("IMMOG_JWT_SECRET").unwrap_or_else(|_| "immog-dev-jwt-secret-change-me".into());
    Ok(from_env.into_bytes())
}

/// Convenience type used by extractors/handlers.
pub type SharedState = Arc<AppState>;