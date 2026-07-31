//! Evolution API (WhatsApp) inbound webhook — W3.
//!
//! Evolution POSTs a JSON envelope `{ event, instance, data, ... }` for each
//! event (delivery/read receipts via `messages.update`, incoming messages via
//! `messages.upsert`, connection changes, …). This endpoint authenticates the
//! request, classifies the event, records it, and acks with 200 quickly so
//! Evolution does not retry.
//!
//! Messaging (US6) is not built yet, so incoming messages are logged (the hook
//! to route them into `domain::messaging` lands with that phase). Delivery/read
//! receipts are logged too — the notification-status store lands with the
//! notifier's persistence layer.

use std::sync::Arc;

use axum::extract::State;
use axum::http::HeaderMap;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/webhooks/evolution", post(receive))
}

/// `POST /api/webhooks/evolution` — receive one Evolution API event.
///
/// Always returns `{ "success": true }` with 200 for authenticated requests,
/// including unhandled event types, to avoid provider retry storms. Rejects
/// unauthenticated requests with 401.
async fn receive(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    verify_webhook_token(&state.cfg, &headers)?;

    let event = payload.get("event").and_then(Value::as_str).unwrap_or("");
    let instance = payload.get("instance").and_then(Value::as_str).unwrap_or("");
    let null = Value::Null;
    let data = payload.get("data").unwrap_or(&null);

    match classify(event) {
        EventKind::StatusUpdate => {
            let (remote, status) = extract_status(data);
            tracing::info!(instance, remote = %remote, status = %status, "evolution: accusé de statut message");
            // TODO (notifier persistence): update the delivery status of the
            // matching outbound notification.
        }
        EventKind::IncomingMessage => {
            let (remote, from_me) = extract_message_meta(data);
            if from_me {
                // Echo of our own outbound message — ignore.
                tracing::debug!(instance, remote = %remote, "evolution: écho message sortant (ignoré)");
            } else {
                tracing::info!(instance, remote = %remote, "evolution: message entrant");
                // TODO (US6 messaging): route into domain::messaging.
            }
        }
        EventKind::Connection => {
            tracing::info!(instance, state = %connection_state(data), "evolution: changement de connexion");
        }
        EventKind::Other => {
            tracing::debug!(instance, event, "evolution: événement non géré");
        }
    }

    Ok(Json(json!({ "success": true })))
}

/// Authenticate the webhook against the configured shared token. An empty
/// configured token accepts everything (dev only) with a warning. The token is
/// read from the `apikey` or `x-webhook-token` header and compared in constant time.
fn verify_webhook_token(cfg: &Config, headers: &HeaderMap) -> AppResult<()> {
    let expected = cfg.evolution_webhook_token.as_bytes();
    if expected.is_empty() {
        // S6 — en production, un webhook non authentifié est une faille (n'importe
        // qui peut imiter Evolution et injecter des accusés/messages). On refuse
        // au boot-time n'est pas possible ici (le token vient de Config), donc on
        // rejette chaque requête. En dev, on laisse passer avec un avertissement.
        if crate::config::is_prod() {
            tracing::error!("webhook Evolution refusé en production : IMMOG_EVOLUTION_WEBHOOK_TOKEN non défini");
            return Err(AppError::Unauthorized);
        }
        tracing::warn!("webhook Evolution non authentifié (IMMOG_EVOLUTION_WEBHOOK_TOKEN non défini)");
        return Ok(());
    }
    let provided = headers
        .get("apikey")
        .or_else(|| headers.get("x-webhook-token"))
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if constant_time_eq(provided.as_bytes(), expected) {
        Ok(())
    } else {
        Err(AppError::Unauthorized)
    }
}

#[derive(Debug, PartialEq)]
enum EventKind {
    StatusUpdate,
    IncomingMessage,
    Connection,
    Other,
}

/// Map an Evolution event name to how we handle it.
fn classify(event: &str) -> EventKind {
    match event {
        "messages.update" | "message.status" | "send.message.update" => EventKind::StatusUpdate,
        "messages.upsert" | "message.upsert" | "messages.set" => EventKind::IncomingMessage,
        "connection.update" | "connection.state" => EventKind::Connection,
        _ => EventKind::Other,
    }
}

/// Extract `(remote_jid, status)` from a `messages.update` data payload, tolerating
/// both object and single-element array shapes Evolution may send.
fn extract_status(data: &Value) -> (String, String) {
    let obj = first_object(data);
    let remote = obj
        .get("key")
        .and_then(|k| k.get("remoteJid"))
        .and_then(Value::as_str)
        .or_else(|| obj.get("remoteJid").and_then(Value::as_str))
        .unwrap_or("")
        .to_string();
    let status = obj
        .get("status")
        .and_then(Value::as_str)
        .or_else(|| obj.get("update").and_then(|u| u.get("status")).and_then(Value::as_str))
        .unwrap_or("")
        .to_string();
    (remote, status)
}

/// Extract `(remote_jid, from_me)` from a `messages.upsert` data payload.
fn extract_message_meta(data: &Value) -> (String, bool) {
    let obj = first_object(data);
    let remote = obj
        .get("key")
        .and_then(|k| k.get("remoteJid"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let from_me = obj
        .get("key")
        .and_then(|k| k.get("fromMe"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    (remote, from_me)
}

fn connection_state(data: &Value) -> String {
    first_object(data)
        .get("state")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string()
}

/// Evolution sometimes wraps `data` in a single-element array; unwrap to the first
/// object so extraction is shape-agnostic.
fn first_object(data: &Value) -> &Value {
    static NULL: Value = Value::Null;
    match data {
        Value::Array(items) => items.first().unwrap_or(&NULL),
        other => other,
    }
}

/// Constant-time byte comparison (length mismatch short-circuits — token length is
/// not sensitive). Avoids leaking match position via early return.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;
    use serde_json::json;

    fn cfg_with_token(tok: &str) -> Config {
        Config { evolution_webhook_token: tok.into(), ..Config::default() }
    }

    #[test]
    fn classify_known_and_unknown_events() {
        assert_eq!(classify("messages.update"), EventKind::StatusUpdate);
        assert_eq!(classify("messages.upsert"), EventKind::IncomingMessage);
        assert_eq!(classify("connection.update"), EventKind::Connection);
        assert_eq!(classify("qrcode.updated"), EventKind::Other);
        assert_eq!(classify(""), EventKind::Other);
    }

    #[test]
    fn empty_token_accepts_all() {
        let headers = HeaderMap::new();
        assert!(verify_webhook_token(&cfg_with_token(""), &headers).is_ok());
    }

    #[test]
    fn configured_token_requires_match() {
        let cfg = cfg_with_token("s3cr3t");
        let mut ok = HeaderMap::new();
        ok.insert("apikey", HeaderValue::from_static("s3cr3t"));
        assert!(verify_webhook_token(&cfg, &ok).is_ok());

        let mut alt = HeaderMap::new();
        alt.insert("x-webhook-token", HeaderValue::from_static("s3cr3t"));
        assert!(verify_webhook_token(&cfg, &alt).is_ok());

        let mut bad = HeaderMap::new();
        bad.insert("apikey", HeaderValue::from_static("wrong"));
        assert!(verify_webhook_token(&cfg, &bad).is_err());

        // missing header
        assert!(verify_webhook_token(&cfg, &HeaderMap::new()).is_err());
    }

    #[test]
    fn extract_status_from_object_and_array() {
        let obj = json!({ "key": { "remoteJid": "224622000000@s.whatsapp.net" }, "status": "DELIVERY_ACK" });
        assert_eq!(
            extract_status(&obj),
            ("224622000000@s.whatsapp.net".into(), "DELIVERY_ACK".into())
        );
        let arr = json!([{ "key": { "remoteJid": "224111@s.whatsapp.net" }, "status": "READ" }]);
        assert_eq!(extract_status(&arr), ("224111@s.whatsapp.net".into(), "READ".into()));
    }

    #[test]
    fn extract_message_meta_detects_from_me() {
        let incoming = json!({ "key": { "remoteJid": "224622@s.whatsapp.net", "fromMe": false } });
        assert_eq!(extract_message_meta(&incoming), ("224622@s.whatsapp.net".into(), false));
        let echo = json!({ "key": { "remoteJid": "224622@s.whatsapp.net", "fromMe": true } });
        assert_eq!(extract_message_meta(&echo).1, true);
    }

    #[test]
    fn constant_time_eq_basic() {
        assert!(constant_time_eq(b"abc", b"abc"));
        assert!(!constant_time_eq(b"abc", b"abd"));
        assert!(!constant_time_eq(b"abc", b"abcd"));
    }
}
