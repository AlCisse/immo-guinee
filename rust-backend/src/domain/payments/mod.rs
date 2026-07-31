//! Payments domain (US4 — commission + escrow, sandbox mobile-money provider).

pub mod dto;
mod handlers;

pub use handlers::routes;

use uuid::Uuid;

/// Human-readable payment/contract reference derived from an id: `PAY-XXXXXXXX`.
pub fn reference_paiement_for(id: Uuid) -> String {
    format!("PAY-{}", id.simple().to_string()[..8].to_uppercase())
}
