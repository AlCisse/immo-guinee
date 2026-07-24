//! Ratings & reviews domain (US7 / FR-050..FR-053).
//!
//! A rating is left by one party of a completed transaction about the other.
//! The schema enforces one rating per transaction (`transaction_id UNIQUE`).

mod handlers;

pub use handlers::routes;
