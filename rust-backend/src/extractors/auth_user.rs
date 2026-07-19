//! `AuthUser` — resolves the authenticated user from a `Authorization: Bearer`
//! JWT access token. Rejects with `401 Unauthorized` when the header is missing
//! or the token is invalid/expired/of the wrong kind.

use std::sync::Arc;

use axum::extract::{FromRef, FromRequestParts};
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use redis::AsyncCommands;
use uuid::Uuid;

use crate::auth::jwt::{self, TokenType};
use crate::auth::rbac::{Permission, Role};
use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// Redis key for a revoked (logged-out) token id.
pub fn revoked_key(jti: Uuid) -> String {
    format!("revoked:{jti}")
}

/// The authenticated caller, injected into handlers that require a valid token.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    /// Role carried in the token; authorization checks go through `rbac`.
    pub role: String,
    /// Token id (for logout/revocation).
    pub jti: Uuid,
    /// Token expiry (unix seconds), used to size the revocation TTL.
    pub exp: u64,
}

impl AuthUser {
    /// The caller's role, if it is a known role.
    pub fn role(&self) -> Option<Role> {
        self.role.parse().ok()
    }

    /// Require the caller to hold exactly `role`, else `403 Forbidden`.
    pub fn require_role(&self, role: Role) -> AppResult<()> {
        if self.role() == Some(role) {
            Ok(())
        } else {
            Err(AppError::Forbidden(format!("rôle {role:?} requis")))
        }
    }

    /// Require the caller's role to grant `perm`, else `403 Forbidden`.
    pub fn require_permission(&self, perm: Permission) -> AppResult<()> {
        match self.role() {
            Some(role) if role.has(perm) => Ok(()),
            _ => Err(AppError::Forbidden(format!("permission {perm:?} requise"))),
        }
    }
}

/// Extract the `Bearer` token from the `Authorization` header, if present.
fn bearer_token(parts: &Parts) -> Option<&str> {
    let value = parts.headers.get(AUTHORIZATION)?.to_str().ok()?;
    value
        .strip_prefix("Bearer ")
        .or_else(|| value.strip_prefix("bearer "))
        .map(str::trim)
}

impl<S> FromRequestParts<S> for AuthUser
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app = Arc::<AppState>::from_ref(state);
        let token = bearer_token(parts).ok_or(AppError::Unauthorized)?;
        let claims = jwt::verify(&app.jwt_secret, token, TokenType::Access)?;

        // Reject tokens revoked via logout (Redis deny-list).
        let mut conn = app.redis.clone();
        let revoked: bool = conn.exists(revoked_key(claims.jti)).await?;
        if revoked {
            return Err(AppError::Unauthorized);
        }

        Ok(AuthUser { id: claims.sub, role: claims.role, jti: claims.jti, exp: claims.exp })
    }
}
