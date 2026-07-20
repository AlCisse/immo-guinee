//! Application state — the "service container" (replaces Laravel DI / facades).
//!
//! All shared dependencies are constructed once at boot and passed to handlers
//! via `axum::extract::State<Arc<AppState>>`. No global facades; everything
//! explicit. This is the Rust idiom and is cleaner than Laravel's container.

use std::sync::Arc;

use redis::aio::ConnectionManager;
use sea_orm::DatabaseConnection;

use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::services::storage::S3Storage;
use crate::services::vault::VaultClient;
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
    /// HashiCorp Vault client (AppRole). `None` in dev (env/local fallback).
    pub vault: Option<VaultClient>,
    // Filled in later phases: notifier, queue, ...
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

        // Vault (prod): authenticate via AppRole and load secrets from KV v2.
        // `None` in dev → callers fall back to env/local values.
        let vault = VaultClient::connect(cfg).await?;

        // JWT secret: from Vault KV (secret/immoguinee/app -> jwt_secret) in prod,
        // or `IMMOG_JWT_SECRET` / a dev-only constant locally.
        let jwt_secret = load_jwt_secret(cfg, vault.as_ref()).await?;

        let storage = S3Storage::from_config(cfg)?;
        let whatsapp = WhatsAppClient::from_config(cfg);

        Ok(Self {
            db,
            redis,
            cfg: cfg.clone(),
            jwt_secret,
            storage,
            whatsapp,
            vault,
        })
    }
}

/// Load the JWT secret from Vault (secret/immoguinee/app -> jwt_secret) in prod,
/// or from `IMMOG_JWT_SECRET` / a dev-only constant locally.
async fn load_jwt_secret(cfg: &Config, vault: Option<&VaultClient>) -> AppResult<Vec<u8>> {
    if let Some(v) = vault {
        let data = v.read_kv(&cfg.jwt_secret_vault_path).await?;
        let secret = data["jwt_secret"]
            .as_str()
            .ok_or_else(|| AppError::Internal(anyhow::anyhow!("jwt_secret absent dans Vault {}", cfg.jwt_secret_vault_path)))?;
        return Ok(secret.as_bytes().to_vec());
    }
    // Dev fallback (no Vault configured): env var or a dev-only constant.
    let from_env = std::env::var("IMMOG_JWT_SECRET").unwrap_or_else(|_| "immog-dev-jwt-secret-change-me".into());
    Ok(from_env.into_bytes())
}

/// Convenience type used by extractors/handlers.
pub type SharedState = Arc<AppState>;