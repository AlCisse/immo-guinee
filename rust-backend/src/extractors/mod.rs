//! Request extractors (replace Laravel FormRequest validation + middleware).

use axum::body::Body;
use axum::extract::FromRequest;
use axum::http::Request;
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::error::AppError;

mod auth_user;
pub use auth_user::AuthUser;

/// Deserialize a JSON body and run `validator` rules before the handler sees it
/// (replaces Laravel FormRequest `rules()` + `validated()`). Reuses `axum::Json`
/// for the (battle-tested) body reader, then validates.
pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequest<S> for ValidatedJson<T>
where
    T: DeserializeOwned + Validate + Send + Sync + 'static,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request(req: Request<Body>, state: &S) -> Result<Self, Self::Rejection> {
        let json = axum::Json::<T>::from_request(req, state)
            .await
            .map_err(|rej| AppError::Validation(format!("JSON invalide: {rej}")))?;
        json.0
            .validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;
        Ok(ValidatedJson(json.0))
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