//! Admin & moderation handlers (Phase 5).
//!
//! Every route requires a staff permission via `auth.require_permission(..)`.
//! Responses use the `{success, data}` envelope the admin frontend expects.

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect,
};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::auth::rbac::Permission;
use crate::db::entities::sea_orm_active_enums::{
    StatutCompte, StatutContrat, StatutLitige, StatutListing, StatutVerificationDoc,
};
use crate::db::entities::{certification_document, contract, dispute, listing, rating, user};
use crate::error::{AppError, AppResult};
use crate::extractors::{AuthUser, ValidatedJson};
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

/// `GET /api/admin/analytics` — minimal analytics payload (period echo + totals).
async fn analytics(
    auth: AuthUser,
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> AppResult<Json<Value>> {
    auth.require_permission(Permission::ViewAnalytics)?;
    let period: i64 = params.get("period").and_then(|p| p.parse().ok()).unwrap_or(30);
    let total_users = user::Entity::find().count(&state.db).await?;
    let total_listings = listing::Entity::find().count(&state.db).await?;
    Ok(Json(json!({
        "success": true,
        "data": { "period": period, "total_users": total_users, "total_listings": total_listings }
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
    Ok(Json(json!({ "success": true, "data": items })))
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
    let u = user::Entity::find_by_id(id).one(&state.db).await?.ok_or(AppError::NotFound)?;

    let role = req.roles.iter().find(|r| ASSIGNABLE_ROLES.contains(&r.as_str())).cloned();
    let mut am: user::ActiveModel = u.into();
    am.role = Set(role.clone());
    am.update(&state.db).await?;

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
