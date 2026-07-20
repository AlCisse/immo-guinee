//! Application configuration (replaces Laravel config/*.php + env()).
//!
//! Sources, in priority order: IMMOG_* env vars -> config.toml -> defaults.
//! Secrets (DB password, Redis password, JWT secret, Vault creds) are NOT read
//! from here in production — they are fetched from HashiCorp Vault at boot
//! (see state::AppState). Only non-sensitive bootstrap values live in Config.

use figment::{
    Figment,
    providers::{Env, Format, Serialized, Toml},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct Config {
    pub host: String,
    pub port: u16,

    /// PostgreSQL connection string (dev: full URL with creds; prod: Vault-fetched).
    pub database_url: String,

    /// Redis connection URL (dev: with creds; prod: Vault-fetched).
    pub redis_url: String,

    /// S3-compatible endpoint (MinIO in dev, DO Spaces in prod).
    pub s3_endpoint: String,
    /// S3 region label (MinIO ignores it; DO Spaces uses e.g. "fra1").
    pub s3_region: String,
    /// Bucket for listing photos and documents.
    pub s3_bucket: String,

    /// Evolution API base URL (WhatsApp). Empty disables WhatsApp sending.
    pub evolution_base_url: String,
    /// Evolution API instance name (the connected WhatsApp business number).
    pub evolution_instance: String,
    /// Shared token authenticating inbound Evolution webhooks (compared against
    /// the `apikey` / `x-webhook-token` header). Empty accepts all (dev only).
    pub evolution_webhook_token: String,

    /// Vault address (prod). Empty in dev -> Vault client disabled.
    pub vault_addr: String,

    /// AppRole role_id (public, non-secret). secret_id comes from
    /// /run/secrets/vault_approle_secret_id (Docker Secret bootstrap).
    pub vault_approle_role_id: String,

    /// JWT signing/verification secret path in Vault: secret/immoguinee/app -> jwt_secret.
    pub jwt_secret_vault_path: String,

    /// CORS allowed origin (frontend). Falls back to "*" only in dev.
    pub cors_allowed_origin: String,

    /// Request body size limit (bytes).
    pub body_limit_bytes: usize,

    /// Request timeout (seconds).
    pub request_timeout_secs: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".into(),
            port: 8000,
            database_url: "postgres://immog_user:immog@localhost:5433/immog_db".into(),
            redis_url: "redis://:immog_redis_secret@localhost:6379".into(),
            s3_endpoint: "http://localhost:9000".into(),
            s3_region: "us-east-1".into(),
            s3_bucket: "immoguinee-images".into(),
            evolution_base_url: "http://localhost:8080".into(),
            evolution_instance: "immoguinee".into(),
            evolution_webhook_token: String::new(),
            vault_addr: String::new(),
            vault_approle_role_id: String::new(),
            jwt_secret_vault_path: "secret/immoguinee/app".into(),
            cors_allowed_origin: "*".into(),
            body_limit_bytes: 10 * 1024 * 1024, // 10 MiB (multipart listings with photos)
            request_timeout_secs: 60,
        }
    }
}

impl Config {
    pub fn load() -> anyhow::Result<Self> {
        let cfg: Config = Figment::new()
            .merge(Serialized::defaults(Self::default()))
            .merge(Toml::file("config.toml").nested())
            .merge(Env::prefixed("IMMOG_").split("__"))
            .extract()?;
        Ok(cfg)
    }
}