//! Certifications domain (Phase 5): document upload + admin verification (FR-054).
//!
//! Replaces the certification portion of `App\Http\Controllers\Api\AdminController`.
//! Badge progression (Bronze -> Diamant) is deferred — it depends on transactions
//! and ratings, which aren't implemented yet.

mod dto;
mod handlers;

pub use handlers::routes;