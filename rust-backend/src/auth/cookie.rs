//! Auth cookie helpers — the JWT access token is delivered to browsers as an
//! `HttpOnly` cookie so it is never reachable from JavaScript (XSS can't steal
//! the session). Non-browser clients keep using the `Authorization: Bearer`
//! header; the [`AuthUser`](crate::extractors::AuthUser) extractor accepts both.
//!
//! Attributes:
//! - `HttpOnly`            — invisible to `document.cookie` / JS.
//! - `Secure` (prod only)  — only sent over HTTPS. Omitted in dev so the cookie
//!                           works on `http://localhost`.
//! - `SameSite=Lax`        — sent on top-level navigations and same-site XHR
//!                           (the SPA is same-origin with the API proxy), but not
//!                           on cross-site requests → CSRF-resistant for a
//!                           header/JSON API. `Strict` would drop the cookie on
//!                           OAuth redirect returns; `Lax` is the right tradeoff.
//! - `Path=/`              — sent to every route.
//! - `Max-Age`             — mirrors the access-token lifetime.

use crate::auth::jwt::ACCESS_TTL_SECS;
use crate::config::Config;

/// Name of the auth cookie carrying the JWT access token.
pub const AUTH_COOKIE: &str = "access_token";

/// Whether to mark the cookie `Secure`. Prod intent is signalled by a configured
/// Vault address (the project's existing prod marker) or `IMMOG_APP_ENV=production`.
fn is_prod(cfg: &Config) -> bool {
    !cfg.vault_addr.is_empty()
        || std::env::var("IMMOG_APP_ENV").map(|v| v == "production").unwrap_or(false)
}

/// `Set-Cookie` value that stores `token` as an HttpOnly auth cookie.
pub fn set_auth_cookie(cfg: &Config, token: &str) -> String {
    let secure = if is_prod(cfg) { "; Secure" } else { "" };
    format!(
        "{AUTH_COOKIE}={token}; HttpOnly{secure}; SameSite=Lax; Path=/; Max-Age={ACCESS_TTL_SECS}"
    )
}

/// `Set-Cookie` value that clears the auth cookie (logout).
pub fn clear_auth_cookie(cfg: &Config) -> String {
    let secure = if is_prod(cfg) { "; Secure" } else { "" };
    format!("{AUTH_COOKIE}=; HttpOnly{secure}; SameSite=Lax; Path=/; Max-Age=0")
}

/// Extract the auth-cookie value from a raw `Cookie` header, if present.
/// Parses `k=v; k2=v2` pairs and returns the value for [`AUTH_COOKIE`].
pub fn token_from_cookie_header(cookie_header: &str) -> Option<&str> {
    cookie_header.split(';').find_map(|pair| {
        let (k, v) = pair.split_once('=')?;
        (k.trim() == AUTH_COOKIE).then(|| v.trim())
    })
}
