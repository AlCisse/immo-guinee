//! WhatsApp sending via Evolution API v2.
//!
//! Sends text through `POST {base}/message/sendText/{instance}` with the `apikey`
//! header. The API key is a secret (env `IMMOG_EVOLUTION_API_KEY` in dev, Vault in
//! prod). Used for OTP-over-WhatsApp and opt-in multi-channel notifications.

use reqwest::Client;
use serde_json::json;

use crate::config::Config;
use crate::error::{AppError, AppResult};

pub struct WhatsAppClient {
    http: Client,
    base_url: String,
    instance: String,
    api_key: String,
}

impl WhatsAppClient {
    pub fn from_config(cfg: &Config) -> Self {
        let api_key = std::env::var("IMMOG_EVOLUTION_API_KEY").unwrap_or_default();
        Self {
            http: Client::new(),
            base_url: cfg.evolution_base_url.trim_end_matches('/').to_owned(),
            instance: cfg.evolution_instance.clone(),
            api_key,
        }
    }

    fn send_text_url(&self) -> String {
        format!("{}/message/sendText/{}", self.base_url, self.instance)
    }

    /// Whether Evolution API is usable (base URL + API key present). When false,
    /// callers fall back to a dev-safe path (e.g. logging the OTP) instead of a
    /// failed HTTP call. Lets the OTP/notification flow run without a live instance.
    pub fn is_configured(&self) -> bool {
        !self.base_url.is_empty() && !self.api_key.is_empty()
    }

    /// Send a text message to `phone`. Returns Ok when Evolution API accepts it; a
    /// non-2xx response or transport error is surfaced.
    pub async fn send_text(&self, phone: &str, text: &str) -> AppResult<()> {
        if self.base_url.is_empty() || self.api_key.is_empty() {
            return Err(AppError::Internal(anyhow::anyhow!(
                "WhatsApp (Evolution API) non configuré"
            )));
        }
        let number = normalize_number(phone);
        let resp = self
            .http
            .post(self.send_text_url())
            .header("apikey", &self.api_key)
            .json(&json!({ "number": number, "text": text }))
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            tracing::error!(%status, %body, "evolution sendText failed");
            return Err(AppError::Internal(anyhow::anyhow!("Evolution sendText: HTTP {status}")));
        }
        Ok(())
    }
}

/// Normalize a phone number to the WhatsApp digits format (country code, no `+`,
/// no spaces). Guinea local numbers (9 digits starting with 6) get the 224 prefix.
pub fn normalize_number(phone: &str) -> String {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 9 && digits.starts_with('6') {
        format!("224{digits}")
    } else {
        digits
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_strips_plus_and_spaces() {
        assert_eq!(normalize_number("+224 622 00 00 00"), "224622000000");
        assert_eq!(normalize_number("224622000000"), "224622000000");
    }

    #[test]
    fn normalize_prefixes_guinea_local() {
        assert_eq!(normalize_number("622000000"), "224622000000");
    }
}
