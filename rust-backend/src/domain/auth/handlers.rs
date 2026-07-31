//! Auth endpoints (T078-T083): register, login, 2FA TOTP verification.
//!
//! - register : bcrypt-hash the password (compatible with existing hashes) and
//!               insert the user. Field validation runs in the `ValidatedJson`
//!               extractor. Rate-limited per telephone.
//! - login    : verify telephone + password, check account status, issue a JWT
//!               pair — or, if 2FA is enabled, return a `requires_2fa` marker.
//! - otp      : validate a 6-digit TOTP (RFC 6238, totp-rs) against the user's
//!               stored base32 secret, then issue the JWT pair.
//!
//! The SMS 6-digit OTP (services::otp, FR-001 phone verification) is a *different*
//! flow and is not wired here — it belongs to the phone-verification step.

use std::sync::Arc;

use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use redis::AsyncCommands;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use serde_json::json;
use uuid::Uuid;

use crate::auth::jwt;
use crate::config::Config;
use crate::db::entities::sea_orm_active_enums::{StatutCompte, TypeCompte};
use crate::db::entities::user;
use crate::error::{AppError, AppResult};
use crate::extractors::{revoked_key, user_invalid_before_key, AuthUser, ValidatedJson};
use crate::middleware::rate_limit;
use crate::state::AppState;

use super::dto::{
    effective_role, Envelope, LoginRequest, LoginResponse, LoginSuccess, OtpRequest, OtpSendRequest,
    RegisterRequest, UpdateProfileRequest, UserPublic,
};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/otp", post(otp))
        .route("/auth/otp/send", post(otp_send))
        .route("/auth/otp/verify", post(otp_verify))
        .route("/auth/refresh", post(refresh))
        .route("/auth/me", get(me).patch(update_me))
        .route("/auth/logout", post(logout))
}

/// `GET /api/auth/me` — the authenticated user's profile.
async fn me(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Envelope<UserPublic>>> {
    let user = user::Entity::find_by_id(auth.id)
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;
    Ok(Json(Envelope { success: true, data: UserPublic::from(user) }))
}

/// `POST /api/auth/logout` — revoke the current access token AND the refresh
/// token (Redis deny-list, TTL = each token's remaining lifetime). Revoking the
/// refresh token too is what actually ends the session: without it, a stolen
/// refresh cookie could keep minting new access tokens for 7 days after the
/// user logs out.
async fn logout(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> AppResult<axum::response::Response> {
    let now = jsonwebtoken::get_current_timestamp();
    let mut conn = state.redis.clone();

    // Revoke the access token (deny-list its jti for its remaining lifetime).
    let ttl = auth.exp.saturating_sub(now).max(1);
    let _: () = conn.set_ex(revoked_key(auth.jti), 1, ttl).await?;

    // Revoke the refresh token carried by the HttpOnly cookie, so a stolen
    // refresh cookie can no longer be exchanged for fresh access tokens. The
    // `Authorization` header here holds the *access* token (consumed by the
    // AuthUser extractor), so only the cookie can carry the refresh token on
    // this route.
    if let Some(rt) = headers
        .get(axum::http::header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(crate::auth::cookie::refresh_from_cookie_header)
    {
        if let Ok(claims) = jwt::verify(&state.jwt_secret, rt, jwt::TokenType::Refresh) {
            let rttl = claims.exp.saturating_sub(now).max(1);
            let _: () = conn.set_ex(revoked_key(claims.jti), 1, rttl).await?;
        }
    }

    // Also clear both HttpOnly cookies so a cookie-based session ends here too.
    let mut resp = Json(Envelope { success: true, data: json!({ "message": "Déconnecté" }) }).into_response();
    append_cookie(&mut resp, &crate::auth::cookie::clear_auth_cookie(&state.cfg));
    append_cookie(&mut resp, &crate::auth::cookie::clear_refresh_cookie(&state.cfg));
    Ok(resp)
}

/// Append a `Set-Cookie` header (multiple allowed) to a response.
fn append_cookie(resp: &mut axum::response::Response, cookie: &str) {
    if let Ok(v) = HeaderValue::from_str(cookie) {
        resp.headers_mut().append(axum::http::header::SET_COOKIE, v);
    }
}

/// Build a `200` response that carries the token payload in the JSON body AND
/// sets the HttpOnly access + refresh cookies. The body keeps the tokens for
/// backward compatibility (non-browser clients / transition); browsers rely on
/// the cookies.
fn token_response<T: serde::Serialize>(cfg: &Config, data: T, tokens: &jwt::TokenPair) -> axum::response::Response {
    let mut resp = Json(Envelope { success: true, data }).into_response();
    append_cookie(&mut resp, &crate::auth::cookie::set_auth_cookie(cfg, &tokens.access_token));
    append_cookie(&mut resp, &crate::auth::cookie::set_refresh_cookie(cfg, &tokens.refresh_token));
    resp
}

/// `POST /api/auth/refresh` — exchange a valid refresh token (HttpOnly cookie,
/// or `Authorization: Bearer` for non-browser clients) for a fresh token pair,
/// re-setting both cookies. Rotates the refresh token on every call. Rejects
/// tokens invalidated by an admin ban/role change (same deny-list the access
/// extractor honours), so a banned user cannot keep refreshing for 7 days.
async fn refresh(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> AppResult<axum::response::Response> {
    // Prefer the HttpOnly refresh cookie; fall back to a Bearer refresh token.
    let cookie_token = headers
        .get(axum::http::header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(crate::auth::cookie::refresh_from_cookie_header);
    let bearer_token = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer ").or_else(|| v.strip_prefix("bearer ")))
        .map(str::trim);
    let token = cookie_token.or(bearer_token).filter(|t| !t.is_empty()).ok_or(AppError::Unauthorized)?;

    let claims = jwt::verify(&state.jwt_secret, token, jwt::TokenType::Refresh)?;

    let mut conn = state.redis.clone();

    // Reject refresh tokens that were revoked — either explicitly at logout, or
    // rotated out on a previous refresh (see rotation below). This closes the
    // "stolen refresh cookie survives logout" gap: a revoked jti can no longer
    // mint new tokens.
    let revoked: bool = conn.exists(revoked_key(claims.jti)).await?;
    if revoked {
        return Err(AppError::Unauthorized);
    }

    // Honour the per-user deny-list: a token issued before an admin ban/role
    // change is rejected (mirrors the AuthUser extractor).
    let invalid_before: Option<i64> = conn.get(user_invalid_before_key(claims.sub)).await?;
    if let Some(ts) = invalid_before {
        if (claims.iat as i64) < ts {
            return Err(AppError::Unauthorized);
        }
    }

    // Rotate the refresh token: invalidate the presented token before issuing
    // the new pair, so each refresh token is single-use. A replay of the old
    // token now hits the deny-list above and is rejected — which also signals a
    // stolen-token reuse (a future hardening can invalidate the whole family
    // via `user_invalid_before` on detected reuse).
    let now = jsonwebtoken::get_current_timestamp();
    let rttl = claims.exp.saturating_sub(now).max(1);
    let _: () = conn.set_ex(revoked_key(claims.jti), 1, rttl).await?;

    let tokens = jwt::issue_pair(&state.jwt_secret, claims.sub, &claims.role)?;
    Ok(token_response(&state.cfg, LoginSuccess { tokens: tokens.clone() }, &tokens))
}

/// `PATCH /api/auth/me` — update the profile and notification preferences (FR-005).
async fn update_me(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<UpdateProfileRequest>,
) -> AppResult<Json<Envelope<UserPublic>>> {
    let user = user::Entity::find_by_id(auth.id)
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    // Merge the partial notification toggles into the stored JSON object.
    let mut prefs = user.preferences_notification.clone();
    if let (Some(n), Some(obj)) = (req.notifications, prefs.as_object_mut()) {
        if let Some(v) = n.push {
            obj.insert("push".into(), json!(v));
        }
        if let Some(v) = n.sms {
            obj.insert("sms".into(), json!(v));
        }
        if let Some(v) = n.email {
            obj.insert("email".into(), json!(v));
        }
        if let Some(v) = n.whatsapp {
            obj.insert("whatsapp".into(), json!(v));
        }
    }

    let mut am: user::ActiveModel = user.into();
    if let Some(nom) = req.nom_complet {
        am.nom_complet = Set(nom);
    }
    if let Some(bio) = req.bio {
        am.bio = Set(Some(bio));
    }
    if let Some(email) = req.email {
        am.email = Set(Some(email));
    }
    am.preferences_notification = Set(prefs);

    let updated = am.update(&state.db).await?;
    Ok(Json(Envelope { success: true, data: UserPublic::from(updated) }))
}

async fn register(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<RegisterRequest>,
) -> AppResult<Json<Envelope<UserPublic>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;

    let existing = user::Entity::find()
        .filter(user::Column::Telephone.eq(req.telephone.as_str()))
        .one(&state.db)
        .await?;
    if existing.is_some() {
        return Err(AppError::Conflict("Téléphone déjà enregistré".into()));
    }

    let hash = bcrypt::hash(req.mot_de_passe.as_bytes(), 12)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("bcrypt hash: {e}")))?;
    let type_compte = req.type_compte.unwrap_or(TypeCompte::Particulier);

    let model = user::ActiveModel {
        id: Set(Uuid::new_v4()),
        telephone: Set(req.telephone.clone()),
        mot_de_passe_hash: Set(hash),
        nom_complet: Set(req.nom_complet.clone()),
        email: Set(req.email.clone()),
        type_compte: Set(type_compte),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    // FR-001: deliver a phone-verification OTP over WhatsApp (Evolution API).
    // Delivery failure must not fail registration — the account exists and the
    // user can request a resend via POST /auth/otp/send.
    if let Err(e) = crate::services::notify::issue_and_send_otp(&state, &model.telephone).await {
        tracing::warn!(error = %e, telephone = %model.telephone, "envoi OTP à l'inscription échoué");
    }

    Ok(Json(Envelope { success: true, data: UserPublic::from(model) }))
}

/// `POST /api/auth/otp/send` — (re)send a phone-verification OTP over WhatsApp.
///
/// Anti-enumeration: the response is identical whether or not the number is
/// registered; a code is only issued/sent for an existing account. The OTP
/// service still enforces its 60 s resend throttle (429).
async fn otp_send(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<OtpSendRequest>,
) -> AppResult<Json<Envelope<serde_json::Value>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;

    let user = user::Entity::find()
        .filter(user::Column::Telephone.eq(req.telephone.as_str()))
        .one(&state.db)
        .await?;
    if user.is_some() {
        crate::services::notify::issue_and_send_otp(&state, &req.telephone).await?;
    }

    Ok(Json(Envelope {
        success: true,
        data: json!({ "message": "Si ce numéro est enregistré, un code a été envoyé par WhatsApp." }),
    }))
}

/// `POST /api/auth/otp/verify` — verify a phone-verification OTP and, on success,
/// issue a JWT pair (register → OTP → tokens flow). The 6-digit code is checked
/// against Redis (services::otp), which enforces the 3-try / 5 min block.
async fn otp_verify(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<OtpRequest>,
) -> AppResult<axum::response::Response> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;

    crate::services::otp::verify(&state.redis, &req.telephone, &req.code).await?;

    let user = user::Entity::find()
        .filter(user::Column::Telephone.eq(req.telephone.as_str()))
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    if !matches!(user.statut_compte, StatutCompte::Actif) {
        return Err(AppError::Forbidden("Compte suspendu ou banni".into()));
    }

    // FR-001: confirming the OTP marks the phone as verified (first time only).
    let user_id = user.id;
    let role = effective_role(&user);
    if user.telephone_verifie_at.is_none() {
        let mut am: user::ActiveModel = user.into();
        am.telephone_verifie_at = Set(Some(chrono::Utc::now().fixed_offset()));
        am.update(&state.db).await?;
    }

    let tokens = jwt::issue_pair(&state.jwt_secret, user_id, &role)?;
    Ok(token_response(&state.cfg, LoginSuccess { tokens: tokens.clone() }, &tokens))
}

async fn login(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<LoginRequest>,
) -> AppResult<axum::response::Response> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;

    let user = user::Entity::find()
        .filter(user::Column::Telephone.eq(req.telephone.as_str()))
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?; // generic 401 to avoid leaking account existence

    let valid = bcrypt::verify(req.mot_de_passe.as_bytes(), user.mot_de_passe_hash.as_str())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("bcrypt verify: {e}")))?;
    if !valid {
        return Err(AppError::Unauthorized);
    }

    // Reject suspended / banned / soft-deleted accounts.
    if !matches!(user.statut_compte, StatutCompte::Actif) {
        return Err(AppError::Forbidden("Compte suspendu ou banni".into()));
    }

    // FR-001: an unverified phone cannot obtain a session. Re-issue the OTP and
    // signal the client to complete verification (same flow as registration).
    if user.telephone_verifie_at.is_none() {
        if let Err(e) = crate::services::notify::issue_and_send_otp(&state, &user.telephone).await {
            tracing::warn!(error = %e, "renvoi OTP au login (téléphone non vérifié) échoué");
        }
        return Ok(Json(Envelope {
            success: true,
            data: LoginResponse::RequiresOtp(super::dto::LoginRequiresOtp {
                action: "verify_otp".into(),
                telephone: user.telephone.clone(),
            }),
        })
        .into_response());
    }

    if user.two_factor_secret.is_some() {
        return Ok(Json(Envelope {
            success: true,
            data: LoginResponse::Requires2Fa(super::dto::LoginRequires2Fa {
                requires_2fa: true,
                telephone: user.telephone.clone(),
            }),
        })
        .into_response());
    }

    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, &effective_role(&user))?;
    Ok(token_response(&state.cfg, LoginResponse::Tokens(LoginSuccess { tokens: tokens.clone() }), &tokens))
}

async fn otp(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<OtpRequest>,
) -> AppResult<axum::response::Response> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;

    let user = user::Entity::find()
        .filter(user::Column::Telephone.eq(req.telephone.as_str()))
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    // Reject suspended / banned / soft-deleted accounts — the 2FA TOTP flow must
    // not be a way back in for an account that login and otp_verify already block.
    if !matches!(user.statut_compte, StatutCompte::Actif) {
        return Err(AppError::Forbidden("Compte suspendu ou banni".into()));
    }

    let secret = user
        .two_factor_secret
        .as_ref()
        .ok_or_else(|| AppError::Forbidden("2FA non activée pour ce compte".into()))?;
    // Reuse the TOTP primitive (auth::totp). The account label is irrelevant to
    // verification (check_current only uses the secret) — pass the telephone.
    if !crate::auth::totp::verify(secret, &user.telephone, &req.code)? {
        return Err(AppError::Validation("Code TOTP incorrect".into()));
    }

    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, &effective_role(&user))?;
    Ok(token_response(&state.cfg, LoginSuccess { tokens: tokens.clone() }, &tokens))
}