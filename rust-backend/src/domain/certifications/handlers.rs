//! Certifications endpoints (Phase 5, FR-054):
//! - `POST /api/certifications/upload` — a user uploads a verification document
//!   (CNI / titre foncier / passeport) -> S3 -> `CertificationDocument` (EN_ATTENTE).
//! - `GET  /api/certifications/me`     — the caller's documents (newest first).
//! - `POST /api/certifications/{id}/verify` — admin approve/reject (RBAC
//!   `ManageCertifications`).
//!
//! Badge progression (Bronze -> Argent -> Or -> Diamant) is deferred: it depends
//! on transactions + ratings, which aren't implemented yet.

use std::sync::Arc;

use axum::extract::{DefaultBodyLimit, Multipart, Path, State};
use axum::routing::{get, post};
use axum::Json;
use axum::Router;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use uuid::Uuid;

use crate::auth::rbac::Permission;
use crate::db::entities::certification_document;
use crate::db::entities::sea_orm_active_enums::{StatutVerificationDoc, TypeDocument};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
use crate::state::AppState;

use super::dto::{CertificationResponse, Envelope, MyCertificationsResponse, VerifyRequest};

/// One verification document (scan/photo of a CNI, titre foncier or passeport).
/// 10 MB covers a phone photo or PDF scan comfortably.
const DOC_BODY_LIMIT: usize = 10 * 1024 * 1024;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/certifications/me", get(my_certifications))
        .route(
            "/certifications/upload",
            post(upload).layer(DefaultBodyLimit::max(DOC_BODY_LIMIT)),
        )
        .route("/certifications/{id}/verify", post(verify))
}

/// `POST /api/certifications/upload` — multipart: `type_document` (text field,
/// one of `CNI` / `TITRE_FONCIER` / `PASSEPORT`) + `file` (the document bytes).
async fn upload(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> AppResult<Json<Envelope<CertificationResponse>>> {
    let mut type_document: Option<TypeDocument> = None;
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Validation(format!("upload invalide : {e}")))?
    {
        let name = field.name().unwrap_or("").to_owned();
        let fname = field.file_name().map(|s| s.to_owned());
        let bytes = field
            .bytes()
            .await
            .map_err(|e| AppError::Validation(format!("lecture du fichier : {e}")))?;

        if name == "type_document" {
            let s = std::str::from_utf8(&bytes)
                .map_err(|e| AppError::Validation(format!("type_document : {e}")))?;
            type_document = Some(
                serde_json::from_value::<TypeDocument>(serde_json::Value::String(s.trim().to_owned()))
                    .map_err(|e| AppError::Validation(format!("type_document invalide : {e}")))?,
            );
        } else if name == "file" {
            file_bytes = Some(bytes.to_vec());
            file_name = fname;
        }
    }

    let type_document =
        type_document.ok_or_else(|| AppError::Validation("champ 'type_document' manquant".into()))?;
    let file_bytes = file_bytes.ok_or_else(|| AppError::Validation("champ 'file' manquant".into()))?;
    if file_bytes.is_empty() {
        return Err(AppError::Validation("fichier vide".into()));
    }

    // Validate the real file type by its magic bytes (the client Content-Type is
    // trivially spoofable). Only ID documents are accepted: PDF, JPEG, PNG. The
    // stored content type and extension are derived from the bytes, not the client.
    let (content_type, ext) = detect_allowed_doc_type(&file_bytes).ok_or_else(|| {
        AppError::Validation("format de fichier non supporté : PDF, JPEG ou PNG uniquement".into())
    })?;
    let _ = &file_name; // original name is not trusted for type/extension
    let key = format!("certifications/{}/{}.{}", auth.id, Uuid::new_v4(), ext);
    let url = state.storage.put(&key, &file_bytes, content_type).await?;

    let model = certification_document::ActiveModel {
        id: Set(Uuid::new_v4()),
        utilisateur_id: Set(auth.id),
        type_document: Set(type_document),
        fichier_url: Set(url),
        ..Default::default() // statut EN_ATTENTE, dates default now(), commentaire/admin null
    }
    .insert(&state.db)
    .await?;

    Ok(Json(Envelope { success: true, data: CertificationResponse::from(model) }))
}

/// Identify an uploaded document by its magic bytes and return `(mime, extension)`
/// for the allowed ID-document formats, or `None` to reject. The client-supplied
/// Content-Type / filename are not trusted (spoofable).
fn detect_allowed_doc_type(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(b"%PDF-") {
        Some(("application/pdf", "pdf"))
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("image/jpeg", "jpg"))
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(("image/png", "png"))
    } else {
        None
    }
}

/// `GET /api/certifications/me` — the caller's documents, newest first.
async fn my_certifications(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Envelope<MyCertificationsResponse>>> {
    let docs = certification_document::Entity::find()
        .filter(certification_document::Column::UtilisateurId.eq(auth.id))
        .order_by_desc(certification_document::Column::DateUpload)
        .all(&state.db)
        .await?;
    let certifications = docs.into_iter().map(CertificationResponse::from).collect::<Vec<_>>();
    Ok(Json(Envelope { success: true, data: MyCertificationsResponse { certifications } }))
}

/// `POST /api/certifications/{id}/verify` — admin marks a document approved or
/// rejected, records the admin id + a comment + the verification timestamp.
async fn verify(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<VerifyRequest>,
) -> AppResult<Json<Envelope<CertificationResponse>>> {
    auth.require_permission(Permission::ManageCertifications)?;

    let doc = certification_document::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;

    let statut = if req.decision.eq_ignore_ascii_case("approve") {
        StatutVerificationDoc::Approuve
    } else {
        StatutVerificationDoc::Rejete
    };
    let now = chrono::Utc::now().fixed_offset();

    let mut am: certification_document::ActiveModel = doc.into();
    am.statut_verification = Set(statut);
    am.commentaire_verification = Set(req.commentaire);
    am.verifie_par_admin_id = Set(Some(auth.id));
    am.date_verification = Set(Some(now));
    let updated = am.update(&state.db).await?;

    Ok(Json(Envelope { success: true, data: CertificationResponse::from(updated) }))
}