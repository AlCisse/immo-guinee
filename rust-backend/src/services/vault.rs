//! HashiCorp Vault client over the HTTP API (AppRole auth + KV v2 reads).
//!
//! Implements the prod secrets strategy (specs/001-immog-platform/contracts/secrets.md):
//! each service authenticates via AppRole (role_id from Config + secret_id from the
//! Docker Secret `/run/secrets/vault_approle_secret_id`), then reads static secrets
//! from KV v2 (`secret/immoguinee/*`). Transit (encrypt/decrypt) is added when the
//! first domain that needs at-rest encryption (Facebook tokens / contracts / messages)
//! lands — no speculative code here.
//!
//! Dev fallback: when `vault_addr` / `vault_approle_role_id` are empty, `connect`
//! returns `None` and callers fall back to env/local values — so the whole app and
//! the test suite run without a live Vault.

use serde::Deserialize;
use serde_json::json;

use crate::config::Config;
use crate::error::{AppError, AppResult};

/// The Docker Secret file holding the AppRole `secret_id` (the only secret that
/// must exist outside Vault — the bootstrap credential).
const APPROLE_SECRET_ID_FILE: &str = "/run/secrets/vault_approle_secret_id";

/// A Vault client authenticated with an AppRole-issued token.
///
/// Cheap to clone (`reqwest::Client` is internally `Arc`ed); safe to keep in
/// `AppState` and share across handlers.
#[derive(Clone)]
pub struct VaultClient {
    http: reqwest::Client,
    addr: String,
    token: String,
}

#[derive(Deserialize)]
struct LoginResponse {
    auth: LoginAuth,
}

#[derive(Deserialize)]
struct LoginAuth {
    client_token: String,
}

impl VaultClient {
    /// Authenticate via AppRole when Vault is configured; return `None` in dev.
    ///
    /// Vault is "configured" when both `vault_addr` and `vault_approle_role_id` are
    /// set. The `secret_id` is read from the Docker Secret file, falling back to the
    /// `IMMOG_VAULT_APPROLE_SECRET_ID` env var (local dev without Docker Secrets).
    pub async fn connect(cfg: &Config) -> AppResult<Option<Self>> {
        if cfg.vault_addr.is_empty() || cfg.vault_approle_role_id.is_empty() {
            return Ok(None);
        }
        let secret_id = load_secret_id()?;
        let http = reqwest::Client::new();

        let resp: LoginResponse = http
            .post(format!("{}/v1/auth/approle/login", cfg.vault_addr))
            .json(&json!({ "role_id": cfg.vault_approle_role_id, "secret_id": secret_id }))
            .send()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("vault login HTTP: {e}")))?
            .error_for_status()
            .map_err(|e| AppError::Internal(anyhow::anyhow!("vault login: {e}")))?
            .json()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("vault login body: {e}")))?;

        Ok(Some(Self {
            http,
            addr: cfg.vault_addr.trim_end_matches('/').to_owned(),
            token: resp.auth.client_token,
        }))
    }

    /// Read a KV v2 secret at `full_path` (e.g. `"secret/immoguinee/app"`) and
    /// return its data fields as a JSON object (`{ jwt_secret, app_key, ... }`).
    ///
    /// KV v2 nests the payload under `data.data`, so the response is unwrapped to
    /// that inner object before returning.
    pub async fn read_kv(&self, full_path: &str) -> AppResult<serde_json::Value> {
        let (mount, sub) = full_path
            .split_once('/')
            .ok_or_else(|| AppError::Internal(anyhow::anyhow!("vault path invalide : {full_path}")))?;
        let url = format!("{}/v1/{}/data/{}", self.addr, mount, sub);

        let v: serde_json::Value = self
            .http
            .get(url)
            .header("X-Vault-Token", &self.token)
            .send()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("vault read HTTP: {e}")))?
            .error_for_status()
            .map_err(|e| AppError::Internal(anyhow::anyhow!("vault read {full_path}: {e}")))?
            .json()
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("vault read body: {e}")))?;

        // KV v2: { "data": { "data": { ...fields... }, "metadata": {...} } }
        Ok(v["data"]["data"].clone())
    }
}

/// Load the AppRole `secret_id`: Docker Secret file first, then env (dev without
/// Docker Secrets). Missing both is a hard error in prod (Vault configured but no
/// way to authenticate).
pub fn load_secret_id() -> AppResult<String> {
    if let Ok(s) = std::fs::read_to_string(APPROLE_SECRET_ID_FILE) {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_owned());
        }
    }
    std::env::var("IMMOG_VAULT_APPROLE_SECRET_ID")
        .map(|s| s.trim().to_owned())
        .map_err(|_| {
            AppError::Internal(anyhow::anyhow!(
                "secret_id AppRole introuvable (Docker Secret {APPROLE_SECRET_ID_FILE} ou IMMOG_VAULT_APPROLE_SECRET_ID)"
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connect_returns_none_when_vault_not_configured() {
        // No network: the dev fallback short-circuits before any HTTP call.
        let cfg = Config {
            vault_addr: String::new(),
            vault_approle_role_id: String::new(),
            ..Config::default()
        };
        // `connect` is async; poll it on a minimal runtime to assert Ok(None).
        let rt = tokio::runtime::Builder::new_current_thread().build().unwrap();
        let res = rt.block_on(VaultClient::connect(&cfg)).unwrap();
        assert!(res.is_none(), "dev fallback must yield None");
    }

    #[test]
    fn connect_returns_none_with_only_addr_or_only_role_id() {
        let rt = tokio::runtime::Builder::new_current_thread().build().unwrap();
        let cfg_addr_only =
            Config { vault_addr: "http://vault:8200".into(), vault_approle_role_id: String::new(), ..Config::default() };
        let cfg_role_only =
            Config { vault_addr: String::new(), vault_approle_role_id: "role-x".into(), ..Config::default() };
        assert!(rt.block_on(VaultClient::connect(&cfg_addr_only)).unwrap().is_none());
        assert!(rt.block_on(VaultClient::connect(&cfg_role_only)).unwrap().is_none());
    }
}