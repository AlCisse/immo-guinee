//! Auth domain (T078-T083): register, login, 2FA TOTP verification.
//!
//! Replaces the auth portion of `App\Http\Controllers\Api\AuthController`.
//! Primitives reused (not reimplemented): `auth::jwt` (issue_pair/verify),
//! `middleware::rate_limit::limit_login`, `bcrypt`, `totp-rs`, `services::otp`
//! (the SMS 6-digit flow — separate from TOTP 2FA).

mod dto;
mod handlers;

pub use handlers::routes;