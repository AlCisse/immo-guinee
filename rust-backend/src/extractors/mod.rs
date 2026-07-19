//! Extractors (replace Laravel request injection + FormRequest validation +
//! route model binding + policy authorization + middleware like SetLocale).
//!
//! Idioms (wired incrementally per phase):
//! - `ValidatedJson<T>`   — deserialize + `validator` check before handler (FormRequest)
//! - `AuthUser`           — resolve the authenticated user from JWT/cookie (AuthContext)
//! - `Locale`             — parse Accept-Language (replaces SetLocale middleware)
//! - `Resolve<T>`         — fetch an entity by path id + run its policy (route model binding + authorize)

use std::sync::Arc;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::error::AppError;
use crate::state::AppState;

mod auth_user;
pub use auth_user::AuthUser;

/// Deserialize + validate a JSON body (replaces Laravel FormRequest rules()).
pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequestParts<S> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate + Send,
    S: Send + Sync,
    Arc<AppState>: FromRequestParts<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // We need the full body, so go through axum::Json via the State<Body> approach.
        // Simplest: require the caller to use `axum::Json` then validate in handler.
        // This extractor is a placeholder scaffold; full impl in Phase 1.
        let _ = (parts, state);
        Err(AppError::Internal(anyhow::anyhow!("ValidatedJson extractor not yet implemented (Phase 1)")))
    }
}

/// Parse Accept-Language into a locale code (replaces SetLocale middleware).
/// Returns "fr" by default (FR is the platform default language per constitution).
pub fn locale_from(accept_language: Option<&str>) -> String {
    let al = accept_language.unwrap_or("fr");
    if al.to_ascii_lowercase().starts_with("en") {
        "en".into()
    } else {
        "fr".into()
    }
}