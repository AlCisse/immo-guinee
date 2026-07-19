//! Authentication & authorization.
//!
//! - JWT (`jwt.rs`)   : access (24h) + refresh (7d) tokens, HS256 over the Vault
//!                      secret. Passwords are hashed with bcrypt.
//! - TOTP (`totp.rs`) : RFC 6238 2FA for admins and payments > 500 000 GNF (FR-045).
//! - RBAC (`rbac.rs`) : fixed roles/permissions (static table, no policy engine).
//! - OAuth2 (`oauth2.rs`) : oxide-auth server for third-party token issuance.
//! - Sessions (`sessions.rs`) : tower-sessions cookie auth for the stateful frontend.

pub mod jwt;
pub mod rbac;
// pub mod oauth2;   // enabled in the OAuth2 section
// pub mod sessions; // enabled in the sessions section
// pub mod totp;     // enabled in the 2FA section