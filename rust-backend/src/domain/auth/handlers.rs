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
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use redis::AsyncCommands;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use serde_json::json;
use uuid::Uuid;

use crate::auth::jwt;
use crate::db::entities::sea_orm_active_enums::{StatutCompte, TypeCompte};
use crate::db::entities::user;
use crate::error::{AppError, AppResult};
use crate::extractors::{revoked_key, AuthUser, ValidatedJson};
use crate::middleware::rate_limit;
use crate::state::AppState;

use super::dto::{
    role_for, Envelope, LoginRequest, LoginResponse, LoginSuccess, OtpRequest, OtpSendRequest,
    RegisterRequest, UpdateProfileRequest, UserPublic,
};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/otp", post(otp))
        .route("/auth/otp/send", post(otp_send))
        .route("/auth/otp/verify", post(otp_verify))
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

/// `POST /api/auth/logout` — revoke the current access token (Redis deny-list,
/// TTL = the token's remaining lifetime).
async fn logout(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Envelope<serde_json::Value>>> {
    let ttl = auth.exp.saturating_sub(jsonwebtoken::get_current_timestamp()).max(1);
    let mut conn = state.redis.clone();
    let _: () = conn.set_ex(revoked_key(auth.jti), 1, ttl).await?;
    Ok(Json(Envelope { success: true, data: json!({ "message": "Déconnecté" }) }))
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
) -> AppResult<Json<Envelope<LoginSuccess>>> {
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
    let role = role_for(user.type_compte.clone());
    if user.telephone_verifie_at.is_none() {
        let mut am: user::ActiveModel = user.into();
        am.telephone_verifie_at = Set(Some(chrono::Utc::now().fixed_offset()));
        am.update(&state.db).await?;
    }

    let tokens = jwt::issue_pair(&state.jwt_secret, user_id, role)?;
    Ok(Json(Envelope { success: true, data: LoginSuccess { tokens } }))
}

async fn login(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<LoginRequest>,
) -> AppResult<Json<Envelope<LoginResponse>>> {
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

    if user.two_factor_secret.is_some() {
        return Ok(Json(Envelope {
            success: true,
            data: LoginResponse::Requires2Fa(super::dto::LoginRequires2Fa {
                requires_2fa: true,
                telephone: user.telephone.clone(),
            }),
        }));
    }

    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, role_for(user.type_compte))?;
    Ok(Json(Envelope {
        success: true,
        data: LoginResponse::Tokens(LoginSuccess { tokens }),
    }))
}

async fn otp(
    State(state): State<Arc<AppState>>,
    ValidatedJson(req): ValidatedJson<OtpRequest>,
) -> AppResult<Json<Envelope<LoginSuccess>>> {
    rate_limit::limit_login(&state.redis, &req.telephone).await?;

    let user = user::Entity::find()
        .filter(user::Column::Telephone.eq(req.telephone.as_str()))
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let secret = user
        .two_factor_secret
        .as_ref()
        .ok_or_else(|| AppError::Forbidden("2FA non activée pour ce compte".into()))?;
    // Reuse the TOTP primitive (auth::totp). The account label is irrelevant to
    // verification (check_current only uses the secret) — pass the telephone.
    if !crate::auth::totp::verify(secret, &user.telephone, &req.code)? {
        return Err(AppError::Validation("Code TOTP incorrect".into()));
    }

    let tokens = jwt::issue_pair(&state.jwt_secret, user.id, role_for(user.type_compte))?;
    Ok(Json(Envelope { success: true, data: LoginSuccess { tokens } }))
}