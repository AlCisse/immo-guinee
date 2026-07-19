//! Listings domain (Phase 1, read-only): public search + detail.
//!
//! Replaces `App\Http\Controllers\Api\ListingController` (search + show methods).
//! Write endpoints (store/update/destroy/premium/reactivate) come in a later phase.

mod dto;
mod handlers;
mod query;

pub use handlers::routes;