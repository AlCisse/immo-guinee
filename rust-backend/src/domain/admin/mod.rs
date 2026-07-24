//! Admin & moderation domain (Phase 5).
//!
//! Staff-only endpoints, each guarded by an RBAC permission (see `auth::rbac`):
//! dashboard counts/stats, listing moderation, and user management. Staff access
//! requires the `role` override on the user (admin/moderator/mediator) — see
//! `auth::dto::effective_role`.

mod handlers;

pub use handlers::routes;
