//! End-to-end Evolution webhook receiver (W3) over the real router.
//!
//! Default test config has an empty webhook token → the endpoint is open (dev
//! mode), so these tests exercise routing + deserialization + event dispatch and
//! assert the 200 ack. Token authentication (401) is covered by unit tests in
//! `domain::webhooks::evolution`.
//!
//! Routes are mounted under `/api` (see routes::router).

mod common;

use serde_json::json;

use common::setup;

/// A delivery/read receipt (`messages.update`) is accepted with a 200 ack.
#[tokio::test]
async fn status_update_is_acked() {
    let app = setup().await;

    let res = app
        .server
        .post("/api/webhooks/evolution")
        .json(&json!({
            "event": "messages.update",
            "instance": "immoguinee",
            "data": {
                "key": { "remoteJid": "224622000000@s.whatsapp.net" },
                "status": "DELIVERY_ACK"
            }
        }))
        .await;

    res.assert_status_ok();
    assert_eq!(res.json::<serde_json::Value>()["success"], true);
}

/// An incoming message (`messages.upsert`) is accepted with a 200 ack.
#[tokio::test]
async fn incoming_message_is_acked() {
    let app = setup().await;

    let res = app
        .server
        .post("/api/webhooks/evolution")
        .json(&json!({
            "event": "messages.upsert",
            "instance": "immoguinee",
            "data": {
                "key": { "remoteJid": "224622111222@s.whatsapp.net", "fromMe": false },
                "message": { "conversation": "Bonjour, l'appartement est-il disponible ?" }
            }
        }))
        .await;

    res.assert_status_ok();
    assert_eq!(res.json::<serde_json::Value>()["success"], true);
}

/// An unhandled event type is still acked 200 (no provider retry storm).
#[tokio::test]
async fn unknown_event_is_acked() {
    let app = setup().await;

    let res = app
        .server
        .post("/api/webhooks/evolution")
        .json(&json!({ "event": "qrcode.updated", "instance": "immoguinee", "data": {} }))
        .await;

    res.assert_status_ok();
    assert_eq!(res.json::<serde_json::Value>()["success"], true);
}
