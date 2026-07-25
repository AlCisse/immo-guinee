//! Application state — the "service container" (replaces Laravel DI / facades).
//!
//! All shared dependencies are constructed once at boot and passed to handlers
//! via `axum::extract::State<Arc<AppState>>`. No global facades; everything
//! explicit. This is the Rust idiom and is cleaner than Laravel's container.

use std::sync::Arc;

use redis::aio::ConnectionManager;
use sea_orm::DatabaseConnection;
use serde_json::Value;

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

        // Integration secrets (Evolution API key, S3 creds) from Vault in prod;
        // `None` in dev → env / local fallbacks inside the clients.
        let (evolution_key, s3_access, s3_secret) = load_integration_secrets(cfg, vault.as_ref()).await?;

        let storage = S3Storage::from_config(cfg, s3_access, s3_secret)?;
        let whatsapp = WhatsAppClient::from_config(cfg, evolution_key);

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
    // No Vault client connected.
    if !cfg.vault_addr.is_empty() {
        // Prod intended Vault (vault_addr set) but connect failed → refuse to boot
        // with the public dev secret (would allow forging admin JWTs — critical).
        return Err(AppError::Internal(anyhow::anyhow!(
            "Vault configuré (vault_addr={}) mais connexion échouée — refus de booter avec le secret dev public. \
             Vérifiez vault_approle_role_id + secret_id (/run/secrets/vault_approle_secret_id).",
            cfg.vault_addr
        )));
    }
    // No Vault client. If Vault was *configured* (vault_addr set) but is
    // unavailable, refuse to boot rather than silently signing tokens with a
    // dev secret — otherwise anyone could forge an admin JWT.
    if !cfg.vault_addr.is_empty() {
        return Err(AppError::Internal(anyhow::anyhow!(
            "Vault configuré (IMMOG_VAULT_ADDR) mais indisponible : refus de démarrer avec un secret JWT de repli. Vérifiez l'AppRole / la connectivité Vault."
        )));
    }
    // Explicit prod marker also forbids the dev fallback.
    if std::env::var("IMMOG_JWT_SECRET").is_err()
        && std::env::var("IMMOG_APP_ENV").map(|e| e == "production").unwrap_or(false)
    {
        return Err(AppError::Internal(anyhow::anyhow!(
            "IMMOG_APP_ENV=production sans secret JWT (ni Vault ni IMMOG_JWT_SECRET) : refus de démarrer."
        )));
    }
    // Pure dev (no Vault): env var, or a dev-only constant (with a loud warning).
    match std::env::var("IMMOG_JWT_SECRET") {
        Ok(s) => Ok(s.into_bytes()),
        Err(_) => {
            tracing::warn!(
                "⚠️  Secret JWT de DÉVELOPPEMENT utilisé (aucun Vault, aucun IMMOG_JWT_SECRET). Ne jamais utiliser en production."
            );
            Ok(b"immog-dev-jwt-secret-change-me".to_vec())
        }
    }
}

/// Convenience type used by extractors/handlers.
pub type SharedState = Arc<AppState>;

/// Load the external-integration secrets (Evolution API key, S3 access/secret)
/// from Vault in prod. Returns `(None, None, None)` in dev (no Vault) so the
/// clients fall back to env / local defaults. The keys live alongside
/// `jwt_secret` under the same KV path (`secret/immoguinee/app`).
async fn load_integration_secrets(
    cfg: &Config,
    vault: Option<&VaultClient>,
) -> AppResult<(Option<String>, Option<String>, Option<String>)> {
    let Some(v) = vault else {
        return Ok((None, None, None));
    };
    let data = v.read_kv(&cfg.jwt_secret_vault_path).await?;
    let pick = |k: &str| {
        data.get(k)
            .and_then(Value::as_str)
            .map(|s| s.trim().to_owned())
            .filter(|s| !s.is_empty())
    };
    Ok((pick("evolution_api_key"), pick("s3_access_key"), pick("s3_secret_key")))
}