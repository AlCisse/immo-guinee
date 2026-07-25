//! Response/request DTOs for the certifications domain (FR-054).

use sea_orm::entity::prelude::DateTimeWithTimeZone;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::db::entities::certification_document;
use crate::db::entities::sea_orm_active_enums::{StatutVerificationDoc, TypeDocument};

pub use crate::extractors::Envelope;

/// Public certification-document shape.
#[derive(Debug, Serialize)]
pub struct CertificationResponse {
    pub id: Uuid,
    pub utilisateur_id: Uuid,
    pub type_document: TypeDocument,
    pub fichier_url: String,
    pub statut_verification: StatutVerificationDoc,
    pub commentaire_verification: Option<String>,
    pub verifie_par_admin_id: Option<Uuid>,
    pub date_upload: DateTimeWithTimeZone,
    pub date_verification: Option<DateTimeWithTimeZone>,
}

impl From<certification_document::Model> for CertificationResponse {
    fn from(m: certification_document::Model) -> Self {
        Self {
            id: m.id,
            utilisateur_id: m.utilisateur_id,
            type_document: m.type_document,
            fichier_url: m.fichier_url,
            statut_verification: m.statut_verification,
            commentaire_verification: m.commentaire_verification,
            verifie_par_admin_id: m.verifie_par_admin_id,
            date_upload: m.date_upload,
            date_verification: m.date_verification,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct MyCertificationsResponse {
    pub certifications: Vec<CertificationResponse>,
}

/// Admin verification decision (FR-054). `approve` -> APPROUVE, `reject` -> REJETE.
/// Case-insensitive so "Approve" / "APPROVE" are accepted (a capitalized value
/// was previously rejected by the validator and never reached the handler).
fn validate_decision(d: &str) -> Result<(), ValidationError> {
    match d.to_ascii_lowercase().as_str() {
        "approve" | "reject" => Ok(()),
        _ => {
            let mut err = ValidationError::new("invalid_decision");
            err.message = Some("decision doit être 'approve' ou 'reject'".into());
            Err(err)
        }
    }
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyRequest {
    #[validate(custom(function = "validate_decision"))]
    pub decision: String,
    #[validate(length(max = 500))]
    pub commentaire: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_request_accepts_approve_or_reject() {
        assert!(VerifyRequest { decision: "approve".into(), commentaire: None }.validate().is_ok());
        assert!(
            VerifyRequest { decision: "reject".into(), commentaire: Some("scan illisible".into()) }
                .validate()
                .is_ok()
        );
        // Case-insensitive: a capitalized decision must be accepted (previously
        // the validator rejected "Approve" as an unknown decision).
        assert!(VerifyRequest { decision: "Approve".into(), commentaire: None }.validate().is_ok());
        assert!(VerifyRequest { decision: "REJECT".into(), commentaire: None }.validate().is_ok());
    }

    #[test]
    fn verify_request_rejects_unknown_decision() {
        assert!(VerifyRequest { decision: "maybe".into(), commentaire: None }.validate().is_err());
    }

    #[test]
    fn verify_request_rejects_long_commentaire() {
        let long = "x".repeat(501);
        assert!(
            VerifyRequest { decision: "approve".into(), commentaire: Some(long) }.validate().is_err()
        );
    }
}