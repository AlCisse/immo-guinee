//! Request/response DTOs for the auth domain (replaces Laravel FormRequests +
//! API Resources for AuthController).

use sea_orm::entity::prelude::DateTimeWithTimeZone;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::auth::jwt::TokenPair;
use crate::db::entities::sea_orm_active_enums::{Badge, StatutCompte, StatutVerification, TypeCompte};

/// `{ "success": true, "data": T }` — matches the Laravel success envelope.
#[derive(Debug, Serialize)]
pub struct Envelope<T: Serialize> {
    pub success: bool,
    pub data: T,
}

/// Register payload (FR-001). The SMS phone-verification step is a separate flow
/// (services::otp); this endpoint creates the account with statut_verification =
/// NON_VERIFIE.
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(length(min = 8, max = 20))]
    pub telephone: String,
    #[validate(length(min = 8, max = 72), custom(function = "validate_password_strength"))]
    pub mot_de_passe: String,
    #[validate(length(min = 2, max = 255))]
    pub nom_complet: String,
    #[validate(email)]
    pub email: Option<String>,
    pub type_compte: Option<TypeCompte>,
}

/// Password complexity (FR-003): at least one uppercase letter, one digit and one
/// special character. Length is enforced separately by the `length` validator.
fn validate_password_strength(password: &str) -> Result<(), ValidationError> {
    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());
    if has_upper && has_digit && has_special {
        Ok(())
    } else {
        let mut err = ValidationError::new("weak_password");
        err.message =
            Some("Le mot de passe doit contenir au moins une majuscule, un chiffre et un caractère spécial".into());
        Err(err)
    }
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(length(min = 8, max = 20))]
    pub telephone: String,
    #[validate(length(min = 1, max = 72))]
    pub mot_de_passe: String,
}

/// TOTP second-factor payload (RFC 6238, 6 digits). Also reused by the phone
/// OTP verification endpoint (`POST /auth/otp/verify`), same `{telephone, code}` shape.
#[derive(Debug, Deserialize, Validate)]
pub struct OtpRequest {
    #[validate(length(min = 8, max = 20))]
    pub telephone: String,
    #[validate(length(equal = 6))]
    pub code: String,
}

/// Phone OTP send/resend payload (`POST /auth/otp/send`).
#[derive(Debug, Deserialize, Validate)]
pub struct OtpSendRequest {
    #[validate(length(min = 8, max = 20))]
    pub telephone: String,
}

/// Public user shape (no password hash, no 2FA secret).
#[derive(Debug, Serialize)]
pub struct UserPublic {
    pub id: Uuid,
    pub telephone: String,
    pub email: Option<String>,
    pub nom_complet: String,
    pub bio: Option<String>,
    pub type_compte: TypeCompte,
    pub badge_certification: Badge,
    pub statut_verification: StatutVerification,
    pub statut_compte: StatutCompte,
    /// Phone-verification timestamp (FR-001); `null` until the phone OTP is confirmed.
    pub telephone_verified_at: Option<DateTimeWithTimeZone>,
    pub preferences_notification: serde_json::Value,
    pub date_inscription: DateTimeWithTimeZone,
    /// Effective role (override or type-derived). The frontend gates staff areas
    /// on `roles`; `primary_role` mirrors it for single-role UIs.
    pub primary_role: String,
    pub roles: Vec<String>,
}

impl From<crate::db::entities::user::Model> for UserPublic {
    fn from(m: crate::db::entities::user::Model) -> Self {
        let role = effective_role(&m);
        Self {
            primary_role: role.clone(),
            roles: vec![role],
            id: m.id,
            telephone: m.telephone,
            email: m.email,
            nom_complet: m.nom_complet,
            bio: m.bio,
            type_compte: m.type_compte,
            badge_certification: m.badge_certification,
            statut_verification: m.statut_verification,
            statut_compte: m.statut_compte,
            telephone_verified_at: m.telephone_verifie_at,
            preferences_notification: m.preferences_notification,
            date_inscription: m.date_inscription,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct LoginSuccess {
    /// Flattened into `data`: `{ access_token, refresh_token, expires_in, token_type }`.
    #[serde(flatten)]
    pub tokens: TokenPair,
}

#[derive(Debug, Serialize)]
pub struct LoginRequires2Fa {
    pub requires_2fa: bool,
    pub telephone: String,
}

/// Login returns either tokens (no 2FA) or a 2FA-required marker (then the
/// client POSTs `/api/auth/otp` with the TOTP code to obtain tokens).
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum LoginResponse {
    Tokens(LoginSuccess),
    Requires2Fa(LoginRequires2Fa),
}

/// Partial notification preferences (FR-005): each channel is toggled
/// independently. WhatsApp is opt-in.
#[derive(Debug, Deserialize)]
pub struct NotificationPrefs {
    pub push: Option<bool>,
    pub sms: Option<bool>,
    pub email: Option<bool>,
    pub whatsapp: Option<bool>,
}

/// Profile update payload (PATCH /api/auth/me). All fields optional.
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProfileRequest {
    #[validate(length(min = 2, max = 255, message = "nom complet invalide"))]
    pub nom_complet: Option<String>,
    #[validate(length(max = 500))]
    pub bio: Option<String>,
    #[validate(email(message = "email invalide"))]
    pub email: Option<String>,
    pub notifications: Option<NotificationPrefs>,
}

/// Map the account type to the JWT `role` claim used by RBAC.
///
/// NOTE (assumption): a freshly registered end-user is a searcher. AGENCE maps
/// to the `agence` role; PARTICULIER/DIASPORA map to `chercheur`. Staff roles
/// (admin/moderator/mediator) are assigned out-of-band (not via this flow).
pub fn role_for(type_compte: TypeCompte) -> &'static str {
    match type_compte {
        TypeCompte::Agence => "agence",
        TypeCompte::Particulier | TypeCompte::Diaspora => "chercheur",
    }
}

/// The role to carry in the JWT: the explicit `role` override if set, otherwise
/// derived from the account type. Staff roles (admin/moderator/mediator) are only
/// ever reachable via the override.
pub fn effective_role(user: &crate::db::entities::user::Model) -> String {
    user.role
        .clone()
        .unwrap_or_else(|| role_for(user.type_compte.clone()).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_register() -> RegisterRequest {
        RegisterRequest {
            telephone: "+224622000000".into(),
            mot_de_passe: "Supersecret1!".into(),
            nom_complet: "Awa Diallo".into(),
            email: Some("awa@example.com".into()),
            type_compte: None,
        }
    }

    #[test]
    fn register_valid_passes_validation() {
        assert!(valid_register().validate().is_ok());
    }

    #[test]
    fn register_rejects_long_but_weak_password() {
        // 12 chars but no uppercase / digit / special (FR-003).
        let mut r = valid_register();
        r.mot_de_passe = "abcdefghijkl".into();
        assert!(r.validate().is_err());
    }

    #[test]
    fn register_rejects_short_password_and_bad_email() {
        let mut r = valid_register();
        r.mot_de_passe = "short".into();
        r.email = Some("not-an-email".into());
        assert!(r.validate().is_err());
    }

    #[test]
    fn register_rejects_short_telephone() {
        let mut r = valid_register();
        r.telephone = "123".into();
        assert!(r.validate().is_err());
    }

    #[test]
    fn role_mapping() {
        assert_eq!(role_for(TypeCompte::Agence), "agence");
        assert_eq!(role_for(TypeCompte::Particulier), "chercheur");
        assert_eq!(role_for(TypeCompte::Diaspora), "chercheur");
    }
}