//! Unified error type (replaces Laravel exception handler + JSON responses).
//!
//! Mirrors the Laravel error response format used by the existing API contract
//! (see specs/001-immog-platform/contracts/README.md "Error Response Format"):
//! `{ "success": false, "error": { "code", "message", "details" } }`

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Ressource introuvable")]
    NotFound,

    #[error("Authentification requise")]
    Unauthorized,

    #[error("Accès refusé: {0}")]
    Forbidden(String),

    #[error("Validation: {0}")]
    Validation(String),

    #[error("Conflit: {0}")]
    Conflict(String),

    #[error("Trop de requêtes, réessayez dans {retry_after_secs}s")]
    RateLimited { retry_after_secs: u64 },

    #[error("Erreur base de données: {0}")]
    Database(#[from] sea_orm::DbErr),

    #[error("Erreur cache: {0}")]
    Cache(#[from] redis::RedisError),

    #[error("Erreur interne: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message, details) = match &self {
            AppError::Validation(m) => (StatusCode::BAD_REQUEST, "VALIDATION", m.clone(), None),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, "FORBIDDEN", m.clone(), None),
            AppError::Conflict(m) => (StatusCode::CONFLICT, "CONFLICT", m.clone(), None),
            AppError::RateLimited { retry_after_secs } => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMITED",
                self.to_string(),
                Some(json!({ "retry_after": retry_after_secs })),
            ),
            AppError::NotFound => (StatusCode::NOT_FOUND, "NOT_FOUND", self.to_string(), None),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", self.to_string(), None),
            AppError::Database(e) => {
                tracing::error!(error = ?e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "DB_ERROR", "Erreur base de données".into(), None)
            }
            AppError::Cache(e) => {
                tracing::error!(error = ?e, "cache error");
                (StatusCode::INTERNAL_SERVER_ERROR, "CACHE_ERROR", "Erreur cache".into(), None)
            }
            AppError::Internal(e) => {
                tracing::error!(error = ?e, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL", "Erreur interne".into(), None)
            }
        };

        let body = Json(json!({
            "success": false,
            "error": { "code": code, "message": message, "details": details.unwrap_or(json!(null)) }
        }));

        if let AppError::RateLimited { retry_after_secs } = &self {
            (status, [("Retry-After", retry_after_secs.to_string())], body).into_response()
        } else {
            (status, body).into_response()
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;