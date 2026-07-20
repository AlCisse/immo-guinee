//! Inbound webhooks (replaces EvolutionWebhookController + payment webhooks).
//!
//! Phase 2/W3: Evolution API (WhatsApp) delivery/read receipts and incoming
//! messages. Payment provider webhooks (Orange/MTN) land here in Phase 4.

use std::sync::Arc;

use axum::Router;

use crate::state::AppState;

pub mod evolution;

/// All webhook routes, mounted under `/api` by `routes::router`.
pub fn routes() -> Router<Arc<AppState>> {
    evolution::routes()
}
