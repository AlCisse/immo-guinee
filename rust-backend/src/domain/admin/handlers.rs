//! Admin & moderation handlers (Phase 5).
//!
//! Every route requires a staff permission via `auth.require_permission(..)`.
//! Responses use the `{success, data}` envelope the admin frontend expects.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};
use sea_orm::ActiveEnum;
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use chrono::Utc;
use redis::AsyncCommands;

use crate::auth::jwt::ACCESS_TTL_SECS;
use crate::auth::rbac::Permission;
use crate::db::entities::sea_orm_active_enums::{
    StatutCompte, StatutContrat, StatutLitige, StatutListing, StatutVerificationDoc, StatutVisite,
    TypeBien, TypeCompte,
};
use crate::db::entities::{
    admin_audit_log, certification_document, contract, dispute, listing, rating, transaction, user,
    visit,
};
use crate::error::{AppError, AppResult};
use crate::extractors::{user_invalid_before_key, AuthUser, ValidatedJson};
use crate::state::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/admin/sidebar-counts", get(sidebar_counts))
        .route("/admin/dashboard-stats", get(dashboard_stats))
        .route("/admin/analytics", get(analytics))
        .route("/admin/listings", get(list_listings))
        .route("/admin/listings/{id}", delete(delete_listing))
        .route("/admin/moderation/listings", get(moderation_queue))
        .route("/admin/moderation/listings/{id}", post(moderate_listing))
        .route("/admin/users", get(list_users))
        .route("/admin/users/{id}", post(manage_user))
        .route("/admin/users/{id}/roles/sync", post(sync_roles))
        .route("/admin/roles", get(list_roles))
        // certifications
        .route("/admin/certifications", get(list_certifications))
        .route("/admin/certifications/{id}/approve", post(approve_certification))
        .route("/admin/certifications/{id}/reject", post(reject_certification))
        // disputes
        .route("/admin/disputes", get(list_disputes))
        .route("/admin/disputes/{id}", get(get_dispute))
        .route("/admin/disputes/{id}/assign", post(assign_dispute))
        .route("/admin/disputes/{id}/resolve", post(resolve_dispute))
        .route("/admin/mediators", get(list_mediators))
        // visits
        .route("/admin/visits", get(list_visits))
        .route("/admin/visits/stats", get(visit_stats))
        // audit log
        .route("/admin/logs", get(list_logs))
}

// --- dashboard -------------------------------------------------------------

/// `GET /api/admin/sidebar-counts` — badge counts for the admin sidebar/dashboard.
async fn sidebar_counts(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let db = &state.db;

    let listings_active = listing::Entity::find()
        .filter(listing::Column::Statut.eq(StatutListing::Disponible))
        .count(db)
        .await?;
    let listings_pending = listing::Entity::find()
        .filter(listing::Column::Statut.eq(StatutListing::Suspendu))
        .count(db)
        .await?;
    let certifications_pending = certification_document::Entity::find()
        .filter(certification_document::Column::StatutVerification.eq(StatutVerificationDoc::EnAttente))
        .count(db)
        .await?;
    let ratings_pending = rating::Entity::find()
        .filter(rating::Column::StatutModeration.eq(StatutVerificationDoc::EnAttente))
        .count(db)
        .await?;
    let disputes_open = dispute::Entity::find()
        .filter(dispute::Column::Statut.is_in([StatutLitige::Ouvert, StatutLitige::EnCours]))
        .count(db)
        .await?;
    let contracts_pending = contract::Entity::find()
        .filter(contract::Column::Statut.is_in([StatutContrat::Brouillon, StatutContrat::EnAttenteSignature]))
        .count(db)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "listings_active": listings_active,
            "listings_pending": listings_pending,
            "certifications_pending": certifications_pending,
            "ratings_pending": ratings_pending,
            "disputes_open": disputes_open,
            "contracts_pending": contracts_pending,
            "messages_unread": 0,
        }
    })))
}

/// `GET /api/admin/dashboard-stats` — headline totals.
async fn dashboard_stats(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let db = &state.db;

    let total_users = user::Entity::find().count(db).await?;
    let total_listings = listing::Entity::find().count(db).await?;
    let active_listings = listing::Entity::find()
        .filter(listing::Column::Statut.eq(StatutListing::Disponible))
        .count(db)
        .await?;
    let suspended_users = user::Entity::find()
        .filter(user::Column::StatutCompte.eq(StatutCompte::Suspendu))
        .count(db)
        .await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "total_users": total_users,
            "total_listings": total_listings,
            "active_listings": active_listings,
            "suspended_users": suspended_users,
        }
    })))
}

/// `GET /api/admin/analytics` — dashboard analytics: totals + breakdowns by role
/// and by listing type + transaction volume + average rating. Shaped as the
/// dashboard reads it (`analytics.users.*`, `.listings.*`, `.transactions.*`,
/// `.quality.*`).
async fn analytics(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let period: i64 = params.get("period").and_then(|p| p.parse().ok()).unwrap_or(30);
    let db = &state.db;

    // users_by_role: aggregate instead of loading every user row. Role overrides
    // are grouped by the (string) role column; non-overridden accounts fall back
    // to their type-derived role (chercheur / agence) via two filtered counts.
    let role_groups: Vec<(Option<String>, i64)> = user::Entity::find()
        .select_only()
        .column(user::Column::Role)
        .column_as(Expr::col(user::Column::Id).count(), "count")
        .group_by(user::Column::Role)
        .into_tuple::<(Option<String>, i64)>()
        .all(db)
        .await?;
    let mut users_by_role: HashMap<String, i64> = HashMap::new();
    for (role, count) in role_groups {
        if let Some(r) = role {
            *users_by_role.entry(r).or_insert(0) += count;
        }
    }
    let agence_no_override = user::Entity::find()
        .filter(user::Column::Role.is_null())
        .filter(user::Column::TypeCompte.eq(TypeCompte::Agence))
        .count(db)
        .await? as i64;
    let chercheur_no_override = user::Entity::find()
        .filter(user::Column::Role.is_null())
        .filter(user::Column::TypeCompte.is_in([TypeCompte::Particulier, TypeCompte::Diaspora]))
        .count(db)
        .await? as i64;
    *users_by_role.entry("agence".into()).or_insert(0) += agence_no_override;
    *users_by_role.entry("chercheur".into()).or_insert(0) += chercheur_no_override;

    let total_users = user::Entity::find().count(db).await? as i64;

    // listings: counts via the DB, not by loading every row.
    let active_listings = listing::Entity::find()
        .filter(listing::Column::Statut.eq(StatutListing::Disponible))
        .count(db)
        .await? as i64;
    let mut listings_by_type: HashMap<String, i64> = HashMap::new();
    for variant in TypeBien::values() {
        let c = listing::Entity::find()
            .filter(listing::Column::TypeBien.eq(variant.clone()))
            .count(db)
            .await? as i64;
        let key = serde_json::to_value(&variant)
            .ok()
            .and_then(|v| v.as_str().map(str::to_owned))
            .unwrap_or_else(|| "AUTRE".into());
        listings_by_type.insert(key, c);
    }

    // Transaction volume: SUM aggregate (was: load all rows + sum in RAM).
    let total_volume_gnf: i64 = transaction::Entity::find()
        .select_only()
        .column_as(Expr::col(transaction::Column::MontantTotalGnf).sum(), "total")
        .into_tuple::<(Option<i64>,)>()
        .one(db)
        .await?
        .and_then(|(v,)| v)
        .unwrap_or(0);

    // Average rating: SUM + COUNT (AVG isn't exposed on Expr in this sea_query
    // version); computed from two scalar aggregates instead of loading rows.
    let (rating_sum, rating_count) = rating::Entity::find()
        .select_only()
        .column_as(Expr::col(rating::Column::NoteGlobale).sum(), "sum")
        .column_as(Expr::col(rating::Column::Id).count(), "count")
        .into_tuple::<(Option<i64>, i64)>()
        .one(db)
        .await?
        .unwrap_or((None, 0));
    let average_rating = match (rating_sum, rating_count) {
        (Some(s), c) if c > 0 => (s as f64 / c as f64 * 10.0).round() / 10.0,
        _ => 0.0,
    };

    Ok(Json(json!({
        "success": true,
        "data": {
            "period": period,
            "users": { "total_users": total_users, "users_by_role": users_by_role },
            "listings": { "active_listings": active_listings, "listings_by_type": listings_by_type },
            "transactions": { "total_volume_gnf": total_volume_gnf },
            "quality": { "average_rating": average_rating },
        }
    })))
}

// --- listing moderation ----------------------------------------------------

/// `GET /api/admin/moderation/listings` — listings an admin can act on
/// (available + suspended), newest first, each with its owner.
async fn moderation_queue(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ModerateListings)?;
    let rows = listing::Entity::find()
        .filter(listing::Column::Statut.is_in([StatutListing::Disponible, StatutListing::Suspendu]))
        .order_by_desc(listing::Column::DatePublication)
        .limit(100)
        .all(&state.db)
        .await?;
    let items = listings_with_owners(&state.db, rows).await?;
    Ok(Json(json!({ "success": true, "data": items })))
}

/// `GET /api/admin/listings` — every listing (any status), newest first.
async fn list_listings(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ModerateListings)?;
    let rows = listing::Entity::find()
        .order_by_desc(listing::Column::DatePublication)
        .limit(200)
        .all(&state.db)
        .await?;
    let items = listings_with_owners(&state.db, rows).await?;
    Ok(Json(json!({ "success": true, "data": items })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ModerateRequest {
    /// One of `approve`, `suspend`, `reject`, `delete`.
    pub action: String,
    pub reason: Option<String>,
}

/// `POST /api/admin/moderation/listings/{id}` — approve/suspend/reject/delete.
async fn moderate_listing(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<ModerateRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ModerateListings)?;
    let l = listing::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    let new_statut = match req.action.as_str() {
        "approve" => StatutListing::Disponible,
        "suspend" | "reject" => StatutListing::Suspendu,
        "delete" => StatutListing::Archive,
        other => return Err(AppError::Validation(format!("action inconnue : {other}"))),
    };
    let mut am: listing::ActiveModel = l.into();
    am.statut = Set(new_statut.clone());
    am.update(&state.db).await?;

    audit(&state.db, auth.id, "listing.moderate", "listing", id, json!({ "action": req.action, "reason": req.reason })).await;
    Ok(Json(json!({ "success": true, "data": { "id": id, "statut": new_statut } })))
}

/// `DELETE /api/admin/listings/{id}` — soft-archive a listing.
async fn delete_listing(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageListings)?;
    let l = listing::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    let mut am: listing::ActiveModel = l.into();
    am.statut = Set(StatutListing::Archive);
    am.update(&state.db).await?;
    audit(&state.db, auth.id, "listing.delete", "listing", id, json!({})).await;
    Ok(Json(json!({ "success": true, "data": { "id": id } })))
}

// --- user management -------------------------------------------------------

/// `GET /api/admin/users` — all users, newest first.
async fn list_users(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageUsers)?;
    let rows = user::Entity::find()
        .order_by_desc(user::Column::CreatedAt)
        .limit(200)
        .all(&state.db)
        .await?;
    let items: Vec<Value> = rows.iter().map(user_admin_json).collect();
    let total = items.len();
    Ok(Json(json!({ "success": true, "data": items, "meta": { "total": total } })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ManageUserRequest {
    /// One of `activate`, `suspend`, `ban`, `delete`.
    pub action: String,
    pub reason: Option<String>,
}

/// `POST /api/admin/users/{id}` — change a user's account status.
async fn manage_user(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<ManageUserRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageUsers)?;
    if id == auth.id {
        return Err(AppError::Validation("Vous ne pouvez pas modifier votre propre compte".into()));
    }
    let u = user::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    let new_statut = match req.action.as_str() {
        "activate" => StatutCompte::Actif,
        "suspend" => StatutCompte::Suspendu,
        "ban" => StatutCompte::Banni,
        "delete" => StatutCompte::Supprime,
        other => return Err(AppError::Validation(format!("action inconnue : {other}"))),
    };
    let mut am: user::ActiveModel = u.into();
    am.statut_compte = Set(new_statut.clone());
    am.update(&state.db).await?;

    // Invalidate all of the user's outstanding tokens: a suspended/banned/deleted
    // account must lose access immediately, not when its 24h token expires.
    invalidate_user_tokens(&state, id).await;

    audit(&state.db, auth.id, "user.manage", "user", id, json!({ "action": req.action, "reason": req.reason })).await;
    Ok(Json(json!({ "success": true, "data": { "id": id, "statut_compte": new_statut } })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct SyncRolesRequest {
    pub roles: Vec<String>,
}

/// `POST /api/admin/users/{id}/roles/sync` — set a user's staff role. The model is
/// single-role: the first recognized staff role wins; an empty list clears the
/// override (back to the type-derived role).
async fn sync_roles(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<SyncRolesRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageRoles)?;
    // A staff member must not reassign their own role (self-elevation guard):
    // it would let e.g. an admin keep "admin" or a moderator grant themselves
    // "admin". ManageRoles is for managing *other* users.
    if id == auth.id {
        return Err(AppError::Validation("Vous ne pouvez pas modifier votre propre rôle".into()));
    }
    let u = user::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    let role = req.roles.iter().find(|r| ASSIGNABLE_ROLES.contains(&r.as_str())).cloned();
    let mut am: user::ActiveModel = u.into();
    am.role = Set(role.clone());
    am.update(&state.db).await?;

    // A role change must take effect at once: invalidate outstanding tokens so
    // the old embedded role cannot be used until the user re-authenticates.
    invalidate_user_tokens(&state, id).await;

    audit(&state.db, auth.id, "user.role", "user", id, json!({ "role": role })).await;
    Ok(Json(json!({ "success": true, "data": { "id": id, "role": role } })))
}

/// `GET /api/admin/roles` — the assignable role names.
async fn list_roles(auth: AuthUser) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageRoles)?;
    Ok(Json(json!({ "success": true, "data": ASSIGNABLE_ROLES })))
}

const ASSIGNABLE_ROLES: [&str; 6] =
    ["admin", "moderator", "mediator", "proprietaire", "chercheur", "agence"];

// --- helpers ---------------------------------------------------------------

/// Shape a user for the admin table (status flags the frontend reads).
fn user_admin_json(u: &user::Model) -> Value {
    json!({
        "id": u.id,
        "nom_complet": u.nom_complet,
        "email": u.email,
        "telephone": u.telephone,
        "type_compte": u.type_compte,
        "badge": u.badge_certification,
        "statut_verification": u.statut_verification,
        "statut_compte": u.statut_compte,
        "note_moyenne": u.note_moyenne,
        "created_at": u.created_at,
        "is_active": matches!(u.statut_compte, StatutCompte::Actif),
        "is_suspended": matches!(u.statut_compte, StatutCompte::Suspendu),
        "roles": [crate::domain::auth::dto::effective_role(u)],
    })
}

/// Embed each listing's owner and shape it for the moderation table.
async fn listings_with_owners(
    db: &sea_orm::DatabaseConnection,
    rows: Vec<listing::Model>,
) -> AppResult<Vec<Value>> {
    let owner_ids: Vec<Uuid> = rows.iter().map(|l| l.createur_id).collect();
    let owners: HashMap<Uuid, user::Model> = if owner_ids.is_empty() {
        HashMap::new()
    } else {
        user::Entity::find()
            .filter(user::Column::Id.is_in(owner_ids))
            .all(db)
            .await?
            .into_iter()
            .map(|u| (u.id, u))
            .collect()
    };

    Ok(rows
        .iter()
        .map(|l| {
            let owner = owners.get(&l.createur_id);
            json!({
                "id": l.id,
                "titre": l.titre,
                "type_bien": l.type_bien,
                "type_operation": l.type_operation,
                "quartier": l.quartier,
                "ville": "Conakry",
                "prix_loyer_gnf": l.prix_gnf,
                "prix_gnf": l.prix_gnf,
                "statut": l.statut,
                "photos": l.photos,
                "nombre_vues": l.nombre_vues,
                "signalements_count": 0,
                "created_at": l.date_publication,
                "proprietaire": owner.map(|o| json!({
                    "id": o.id,
                    "nom_complet": o.nom_complet,
                    "telephone": o.telephone,
                })),
            })
        })
        .collect())
}

/// Fetch a set of users keyed by id (for embedding parties/owners).
async fn users_by_ids(
    db: &sea_orm::DatabaseConnection,
    ids: Vec<Uuid>,
) -> AppResult<HashMap<Uuid, user::Model>> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    Ok(user::Entity::find()
        .filter(user::Column::Id.is_in(ids))
        .all(db)
        .await?
        .into_iter()
        .map(|u| (u.id, u))
        .collect())
}

/// Wrap a list in the Laravel-style paginator envelope some admin pages read
/// (`data.data` is the array). A single page is returned — no server paging yet.
fn paginated(items: Vec<Value>) -> Json<Value> {
    let total = items.len();
    Json(json!({
        "success": true,
        "data": {
            "data": items,
            "total": total,
            "current_page": 1,
            "last_page": 1,
            "per_page": total.max(1),
        }
    }))
}

/// A compact `{id, nom_complet, telephone, badge}` for an embedded user.
fn user_ref(u: Option<&user::Model>) -> Value {
    match u {
        Some(u) => json!({
            "id": u.id,
            "nom_complet": u.nom_complet,
            "telephone": u.telephone,
            "badge": u.badge_certification,
        }),
        None => Value::Null,
    }
}

// --- audit trail -----------------------------------------------------------

/// Invalidate all outstanding access tokens for `user_id` by recording the
/// current time as the "tokens issued before this are revoked" boundary. The
/// `AuthUser` extractor checks this against each token's `iat`. Best-effort:
/// a Redis failure is logged (the DB role/status change already succeeded).
async fn invalidate_user_tokens(state: &AppState, user_id: Uuid) {
    let now = jsonwebtoken::get_current_timestamp() as i64;
    let mut conn = state.redis.clone();
    let res: Result<(), _> = conn.set_ex(user_invalid_before_key(user_id), now, ACCESS_TTL_SECS + 60).await;
    if let Err(e) = res {
        tracing::warn!(error = %e, %user_id, "échec invalidation tokens utilisateur");
    }
}

/// Record a staff action. Best-effort: a logging failure must never fail the
/// action it describes, so errors are logged and swallowed.
async fn audit(
    db: &sea_orm::DatabaseConnection,
    admin_id: Uuid,
    action: &str,
    target_type: &str,
    target_id: Uuid,
    details: Value,
) {
    let row = admin_audit_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        admin_id: Set(admin_id),
        action: Set(action.to_owned()),
        target_type: Set(Some(target_type.to_owned())),
        target_id: Set(Some(target_id)),
        details: Set(details),
        created_at: Set(Utc::now().into()),
    };
    if let Err(e) = row.insert(db).await {
        tracing::warn!(error = %e, action, "échec d'écriture du journal d'audit");
    }
}

/// `GET /api/admin/logs` — the audit trail, newest first, with the actor's name.
async fn list_logs(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let rows = admin_audit_log::Entity::find()
        .order_by_desc(admin_audit_log::Column::CreatedAt)
        .limit(200)
        .all(&state.db)
        .await?;
    let admins = users_by_ids(&state.db, rows.iter().map(|r| r.admin_id).collect()).await?;
    let items: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.id,
                "admin_id": r.admin_id,
                "admin": admins.get(&r.admin_id).map(|a| a.nom_complet.clone()),
                "action": r.action,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "details": r.details,
                "created_at": r.created_at,
            })
        })
        .collect();
    Ok(Json(json!({ "success": true, "data": items })))
}

// --- certifications --------------------------------------------------------

/// `GET /api/admin/certifications` — all uploaded documents + their owner.
async fn list_certifications(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageCertifications)?;
    let rows = certification_document::Entity::find()
        .order_by_desc(certification_document::Column::DateUpload)
        .limit(200)
        .all(&state.db)
        .await?;
    let owners = users_by_ids(&state.db, rows.iter().map(|c| c.utilisateur_id).collect()).await?;
    let items: Vec<Value> = rows
        .iter()
        .map(|c| {
            json!({
                "id": c.id,
                "type_document": c.type_document,
                // The current schema has no separate document number / expiry.
                "numero_document": Value::Null,
                "date_expiration": Value::Null,
                "fichier_url": c.fichier_url,
                "statut_verification": c.statut_verification,
                "commentaire_verification": c.commentaire_verification,
                "date_upload": c.date_upload,
                "date_verification": c.date_verification,
                "user": user_ref(owners.get(&c.utilisateur_id)),
            })
        })
        .collect();
    Ok(paginated(items))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ApproveCertRequest {
    pub notes: Option<String>,
}

/// `POST /api/admin/certifications/{id}/approve`.
async fn approve_certification(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<ApproveCertRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageCertifications)?;
    verify_certification(&state, auth.id, id, StatutVerificationDoc::Approuve, req.notes).await
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct RejectCertRequest {
    pub raison: Option<String>,
}

/// `POST /api/admin/certifications/{id}/reject`.
async fn reject_certification(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<RejectCertRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ManageCertifications)?;
    verify_certification(&state, auth.id, id, StatutVerificationDoc::Rejete, req.raison).await
}

/// Shared approve/reject path: set the verification decision + comment + auditor.
async fn verify_certification(
    state: &AppState,
    admin_id: Uuid,
    id: Uuid,
    decision: StatutVerificationDoc,
    comment: Option<String>,
) -> AppResult<Json<Value>> {
    let doc = certification_document::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;
    let mut am: certification_document::ActiveModel = doc.into();
    am.statut_verification = Set(decision.clone());
    am.commentaire_verification = Set(comment);
    am.verifie_par_admin_id = Set(Some(admin_id));
    am.date_verification = Set(Some(Utc::now().into()));
    am.update(&state.db).await?;

    audit(&state.db, admin_id, "certification.verify", "certification", id, json!({ "decision": decision })).await;
    Ok(Json(json!({ "success": true, "data": { "id": id, "statut_verification": decision } })))
}

// --- disputes --------------------------------------------------------------

/// `GET /api/admin/disputes` — all disputes with both parties + assigned mediator.
async fn list_disputes(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ResolveDisputes)?;
    let rows = dispute::Entity::find()
        .order_by_desc(dispute::Column::DateOuverture)
        .limit(200)
        .all(&state.db)
        .await?;
    let mut ids: Vec<Uuid> = Vec::new();
    for d in &rows {
        ids.push(d.demandeur_id);
        ids.push(d.defendeur_id);
        if let Some(m) = d.mediateur_assigne_id {
            ids.push(m);
        }
    }
    let users = users_by_ids(&state.db, ids).await?;
    let items: Vec<Value> = rows.iter().map(|d| dispute_json(d, &users)).collect();
    Ok(paginated(items))
}

/// `GET /api/admin/disputes/{id}` — a single dispute.
async fn get_dispute(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ResolveDisputes)?;
    let d = dispute::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    let mut ids = vec![d.demandeur_id, d.defendeur_id];
    if let Some(m) = d.mediateur_assigne_id {
        ids.push(m);
    }
    let users = users_by_ids(&state.db, ids).await?;
    Ok(Json(json!({ "success": true, "data": dispute_json(&d, &users) })))
}

/// `GET /api/admin/mediators` — users who can be assigned to disputes.
async fn list_mediators(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ResolveDisputes)?;
    let rows = user::Entity::find()
        .filter(user::Column::Role.eq("mediator"))
        .all(&state.db)
        .await?;
    let items: Vec<Value> = rows.iter().map(|u| user_ref(Some(u))).collect();
    Ok(Json(json!({ "success": true, "data": items })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct AssignDisputeRequest {
    pub mediateur_id: Uuid,
}

/// `POST /api/admin/disputes/{id}/assign` — assign a mediator (status → EN_COURS).
async fn assign_dispute(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<AssignDisputeRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ResolveDisputes)?;
    let d = dispute::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;
    let mut am: dispute::ActiveModel = d.into();
    am.mediateur_assigne_id = Set(Some(req.mediateur_id));
    am.date_assignation_mediateur = Set(Some(Utc::now().into()));
    am.statut = Set(StatutLitige::EnCours);
    am.update(&state.db).await?;

    audit(&state.db, auth.id, "dispute.assign", "dispute", id, json!({ "mediateur_id": req.mediateur_id })).await;
    Ok(Json(json!({ "success": true, "data": { "id": id, "mediateur_id": req.mediateur_id } })))
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ResolveDisputeRequest {
    pub statut: Option<String>,
    pub resolution_notes: Option<String>,
    pub montant_resolution: Option<f64>,
}

/// `POST /api/admin/disputes/{id}/resolve` — close a dispute with an outcome.
async fn resolve_dispute(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<ResolveDisputeRequest>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ResolveDisputes)?;
    let d = dispute::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    let statut = match req.statut.as_deref() {
        Some("RESOLU_COMPENSATION") => StatutLitige::ResoluCompensation,
        Some("ECHOUE_ESCALADE") => StatutLitige::EchoueEscalade,
        _ => StatutLitige::ResoluAmiable,
    };
    let resolution = json!({
        "notes": req.resolution_notes,
        "montant_resolution": req.montant_resolution,
    });
    let mut am: dispute::ActiveModel = d.into();
    am.statut = Set(statut.clone());
    am.resolution = Set(Some(resolution.clone()));
    am.date_resolution = Set(Some(Utc::now().into()));
    am.update(&state.db).await?;

    audit(&state.db, auth.id, "dispute.resolve", "dispute", id, json!({ "statut": statut })).await;
    Ok(Json(json!({ "success": true, "data": { "id": id, "statut": statut } })))
}

/// Shape a dispute (+ parties) for the admin table.
fn dispute_json(d: &dispute::Model, users: &HashMap<Uuid, user::Model>) -> Value {
    json!({
        "id": d.id,
        "reference": d.reference,
        "statut": d.statut,
        // The schema models the reason as a category (`type_litige`); expose it as
        // `motif` for the admin UI, with the free-text `description` alongside.
        "motif": d.type_litige,
        "type_litige": d.type_litige,
        "description": d.description,
        "date_ouverture": d.date_ouverture,
        "date_resolution": d.date_resolution,
        "resolution": d.resolution,
        "demandeur": user_ref(users.get(&d.demandeur_id)),
        "defendeur": user_ref(users.get(&d.defendeur_id)),
        "mediateur": d.mediateur_assigne_id.and_then(|m| users.get(&m)).map(|u| user_ref(Some(u))),
    })
}

// --- visits ----------------------------------------------------------------

/// `GET /api/admin/visits` — all scheduled visits with parties + listing title.
async fn list_visits(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let rows = visit::Entity::find()
        .order_by_desc(visit::Column::DateVisite)
        .limit(200)
        .all(&state.db)
        .await?;
    let mut uids: Vec<Uuid> = Vec::new();
    for v in &rows {
        uids.push(v.demandeur_id);
        uids.push(v.proprietaire_id);
    }
    let users = users_by_ids(&state.db, uids).await?;
    let listing_ids: Vec<Uuid> = rows.iter().map(|v| v.annonce_id).collect();
    let listings: HashMap<Uuid, listing::Model> = if listing_ids.is_empty() {
        HashMap::new()
    } else {
        listing::Entity::find()
            .filter(listing::Column::Id.is_in(listing_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|l| (l.id, l))
            .collect()
    };
    let items: Vec<Value> = rows
        .iter()
        .map(|v| {
            json!({
                "id": v.id,
                "annonce_id": v.annonce_id,
                "annonce_titre": listings.get(&v.annonce_id).map(|l| l.titre.clone()),
                "date_visite": v.date_visite,
                "statut": v.statut,
                "message": v.message,
                "demandeur": user_ref(users.get(&v.demandeur_id)),
                "proprietaire": user_ref(users.get(&v.proprietaire_id)),
                "created_at": v.date_creation,
            })
        })
        .collect();
    Ok(Json(json!({ "success": true, "data": items })))
}

/// `GET /api/admin/visits/stats` — visit counts by status.
async fn visit_stats(auth: AuthUser, State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let db = &state.db;
    let by_statut = |s: StatutVisite| visit::Entity::find().filter(visit::Column::Statut.eq(s));
    let total = visit::Entity::find().count(db).await?;
    let pending = by_statut(StatutVisite::EnAttente).count(db).await?;
    let confirmed = by_statut(StatutVisite::Confirmee).count(db).await?;
    let completed = by_statut(StatutVisite::Completee).count(db).await?;
    let cancelled = by_statut(StatutVisite::Annulee).count(db).await?;

    Ok(Json(json!({
        "success": true,
        "data": {
            "total": total,
            "pending": pending,
            "confirmed": confirmed,
            "completed": completed,
            "cancelled": cancelled,
        }
    })))
}
