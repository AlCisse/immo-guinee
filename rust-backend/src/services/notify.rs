//! Notification & OTP delivery over Evolution API (WhatsApp) — W2.
//!
//! Bridges `services::otp` (generation + Redis anti-fraud) and
//! `services::whatsapp` (Evolution transport). Two responsibilities:
//!
//! - **OTP delivery** (FR-001): issue a code and send it by WhatsApp.
//! - **User notifications** (FR-005/FR-061): send a message on the WhatsApp
//!   channel when the user has opted in.
//!
//! Dev-safe fallback: when Evolution API is not configured (`is_configured()`
//! false), the code/message is logged instead of sent, so the whole flow works
//! locally and in tests without a live WhatsApp instance. In **prod intent**
//! (`vault_addr` configured) a missing key is a misconfig, not a dev fallback —
//! the helpers below refuse to silently log OTPs/notifications in that case.

use serde_json::Value;

use crate::db::entities::user;
use crate::error::{AppError, AppResult};
use crate::services::otp;
use crate::state::AppState;

/// When WhatsApp is not configured, decide between the dev-safe log path and a
/// loud prod error. Pure dev (no `vault_addr`) → `Ok` (caller logs the payload).
/// Prod intent without a key → `Err` (must not silently swallow an OTP/message).
fn ensure_dev_or_prod_err(state: &AppState) -> AppResult<()> {
    if state.cfg.vault_addr.is_empty() {
        Ok(())
    } else {
        Err(AppError::Internal(anyhow::anyhow!(
            "WhatsApp (Evolution API) non configuré en production (clé Vault absente) — envoi impossible"
        )))
    }
}

/// Issue a fresh OTP for `phone` (Redis, 5 min TTL, 60 s resend throttle) and
/// deliver it by WhatsApp. Propagates `429` if a code was requested < 60 s ago.
/// If delivery fails after the code was issued, the resend throttle is rolled
/// back so the caller can retry immediately instead of waiting 60 s with no code.
pub async fn issue_and_send_otp(state: &AppState, phone: &str) -> AppResult<()> {
    let code = otp::request(&state.redis, phone).await?;
    if let Err(e) = send_otp_code(state, phone, &code).await {
        let _ = otp::clear_request(&state.redis, phone).await;
        return Err(e);
    }
    Ok(())
}

/// Deliver an already-generated OTP `code` to `phone` over WhatsApp. In dev
/// (Evolution not configured) the code is logged so the flow stays testable.
pub async fn send_otp_code(state: &AppState, phone: &str, code: &str) -> AppResult<()> {
    let text = format!(
        "ImmoGuinée : votre code de vérification est {code}. \
         Il expire dans 5 minutes. Ne le partagez avec personne."
    );
    if state.whatsapp.is_configured() {
        state.whatsapp.send_text(phone, &text).await?;
    } else {
        ensure_dev_or_prod_err(state)?; // loud in prod misconfig; Ok in dev (log below)
        tracing::info!(phone, code, "OTP de développement (WhatsApp non configuré)");
    }
    Ok(())
}

/// Send a WhatsApp message to `phone` directly (no opt-in gate) — used for
/// transactional contact (e.g. a buyer contacting a listing owner). Dev-safe: logs
/// when Evolution API is not configured; fails loud in prod misconfig.
pub async fn send_direct(state: &AppState, phone: &str, message: &str) -> AppResult<()> {
    if state.whatsapp.is_configured() {
        state.whatsapp.send_text(phone, message).await?;
    } else {
        ensure_dev_or_prod_err(state)?;
        tracing::info!(phone, %message, "message WhatsApp de développement (non configuré)");
    }
    Ok(())
}

/// Send a WhatsApp notification to `user` when they have opted into the WhatsApp
/// channel (FR-005). Returns `Ok(false)` (no-op) when the channel is disabled.
/// In dev (Evolution not configured) the message is logged; fails loud in prod.
pub async fn notify_whatsapp(state: &AppState, user: &user::Model, message: &str) -> AppResult<bool> {
    if !whatsapp_opt_in(&user.preferences_notification) {
        return Ok(false);
    }
    if state.whatsapp.is_configured() {
        state.whatsapp.send_text(&user.telephone, message).await?;
    } else {
        ensure_dev_or_prod_err(state)?;
        tracing::info!(telephone = %user.telephone, %message, "notification WhatsApp de développement (non configuré)");
    }
    Ok(true)
}

/// Whether the user's notification preferences enable the WhatsApp channel.
/// WhatsApp is opt-in: absent/invalid preferences default to disabled.
fn whatsapp_opt_in(prefs: &Value) -> bool {
    prefs
        .get("whatsapp")
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn opt_in_true_only_when_explicitly_enabled() {
        assert!(whatsapp_opt_in(&json!({ "whatsapp": true })));
    }

    #[test]
    fn opt_in_defaults_to_false() {
        assert!(!whatsapp_opt_in(&json!({ "whatsapp": false })));
        assert!(!whatsapp_opt_in(&json!({ "sms": true })));
        assert!(!whatsapp_opt_in(&json!({})));
        assert!(!whatsapp_opt_in(&json!({ "whatsapp": "yes" }))); // wrong type → false
    }
}
