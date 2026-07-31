//! JWT signing & verification (access + refresh tokens).
//!
//! HS256 over the secret held in `AppState.jwt_secret` (loaded from Vault in prod,
//! env in dev). Access tokens live 24h, refresh tokens 7 days.

use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};

pub const ACCESS_TTL_SECS: u64 = 24 * 3600;
pub const REFRESH_TTL_SECS: u64 = 7 * 24 * 3600;

/// JWT issuer & audience — bound to this service (S9). `verify` requires and
/// checks them, so a token minted for another service — even signed with the
/// same HS256 secret — can't be replayed against this API (anti confusion de
/// destinataire).
pub const JWT_ISSUER: &str = "immoguinee";
pub const JWT_AUDIENCE: &str = "immoguinee-api";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TokenType {
    Access,
    Refresh,
}

/// JWT claims. `sub` is the user id; `role` allows cheap authorization checks
/// without a DB round-trip (fine-grained rules go through casbin).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub role: String,
    pub token_type: TokenType,
    pub iat: u64,
    pub exp: u64,
    /// Not-before (S9) : le token n'est pas valide avant cette date. Posé à
    /// `iat` à l'émission, vérifié (`validate_nbf`) à la vérification.
    pub nbf: u64,
    /// Émetteur (S9) — vérifié contre `JWT_ISSUER`.
    pub iss: String,
    /// Audience (S9) — vérifiée contre `JWT_AUDIENCE`.
    pub aud: String,
    /// Token id — enables per-token revocation (Redis deny-list) later.
    pub jti: Uuid,
}

/// A freshly issued access/refresh pair, ready to return to the client.
#[derive(Debug, Clone, Serialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    /// Access token lifetime in seconds (for the client to schedule refresh).
    pub expires_in: u64,
    pub token_type: &'static str,
}

fn issue(secret: &[u8], user_id: Uuid, role: &str, token_type: TokenType) -> AppResult<String> {
    let now = jsonwebtoken::get_current_timestamp();
    let ttl = match token_type {
        TokenType::Access => ACCESS_TTL_SECS,
        TokenType::Refresh => REFRESH_TTL_SECS,
    };
    let claims = Claims {
        sub: user_id,
        role: role.to_owned(),
        token_type,
        iat: now,
        exp: now + ttl,
        nbf: now,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        jti: Uuid::new_v4(),
    };
    encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(secret))
        .map_err(|e| AppError::Internal(anyhow::anyhow!("jwt encode: {e}")))
}

/// Issue an access + refresh pair for a user.
pub fn issue_pair(secret: &[u8], user_id: Uuid, role: &str) -> AppResult<TokenPair> {
    Ok(TokenPair {
        access_token: issue(secret, user_id, role, TokenType::Access)?,
        refresh_token: issue(secret, user_id, role, TokenType::Refresh)?,
        expires_in: ACCESS_TTL_SECS,
        token_type: "Bearer",
    })
}

/// Verify a token and ensure it is of the expected kind. Any failure (bad
/// signature, expired, wrong type) maps to `401 Unauthorized`.
pub fn verify(secret: &[u8], token: &str, expected: TokenType) -> AppResult<Claims> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    // S9 — anti confusion de destinataire : exige et vérifie `iss`/`aud`, et
    // valide `nbf`. `validate_aud`/`validate_iss` ne s'appliquent que si le claim
    // est présent dans le token ; on les rend donc obligatoires via
    // `required_spec_claims`, sinon un token sans `aud` (ex. minté pour un autre
    // service avec le même secret) passerait silencieusement.
    validation.validate_nbf = true;
    validation.set_audience(&[JWT_AUDIENCE]);
    validation.set_issuer(&[JWT_ISSUER]);
    validation.set_required_spec_claims(&["exp", "nbf", "aud", "iss"]);
    let data = decode::<Claims>(token, &DecodingKey::from_secret(secret), &validation)
        .map_err(|_| AppError::Unauthorized)?;
    if data.claims.token_type != expected {
        return Err(AppError::Unauthorized);
    }
    Ok(data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_access_token() {
        let secret = b"test-secret";
        let uid = Uuid::new_v4();
        let pair = issue_pair(secret, uid, "proprietaire").unwrap();

        let claims = verify(secret, &pair.access_token, TokenType::Access).unwrap();
        assert_eq!(claims.sub, uid);
        assert_eq!(claims.role, "proprietaire");
        assert_eq!(claims.token_type, TokenType::Access);

        // an access token must not verify as a refresh token
        assert!(verify(secret, &pair.access_token, TokenType::Refresh).is_err());
        // a wrong secret must fail
        assert!(verify(b"other", &pair.access_token, TokenType::Access).is_err());
    }
}
