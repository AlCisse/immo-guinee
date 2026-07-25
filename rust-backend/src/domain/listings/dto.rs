//! Response DTOs for the listings domain (replaces Laravel API Resources).
//!
//! Responses are wrapped in `Envelope { success, data }` to match the existing
//! API contract shape (`{ "success": true, "data": { ... } }`).

use serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::DateTimeWithTimeZone;
use uuid::Uuid;
use validator::Validate;

use crate::db::entities::listing;
use crate::db::entities::sea_orm_active_enums::{Quartier, StatutListing, TypeBien, TypeOperation};

pub use crate::extractors::Envelope;

/// Public-facing listing shape (subset of the entity; no soft-delete/admin columns).
#[derive(Debug, Serialize)]
pub struct ListingResponse {
    pub id: Uuid,
    pub createur_id: Uuid,
    pub type_operation: TypeOperation,
    pub type_bien: TypeBien,
    pub titre: String,
    pub description: String,
    pub prix_gnf: i64,
    pub quartier: Quartier,
    pub adresse_complete: Option<String>,
    pub superficie_m2: Option<i32>,
    pub nombre_chambres: Option<i32>,
    pub nombre_salons: Option<i32>,
    pub caution_mois: Option<i32>,
    pub equipements: serde_json::Value,
    pub photos: serde_json::Value,
    pub statut: StatutListing,
    pub nombre_vues: i32,
    pub options_premium: serde_json::Value,
    pub date_publication: DateTimeWithTimeZone,
    pub date_expiration: DateTimeWithTimeZone,
}

impl From<listing::Model> for ListingResponse {
    fn from(m: listing::Model) -> Self {
        Self {
            id: m.id,
            createur_id: m.createur_id,
            type_operation: m.type_operation,
            type_bien: m.type_bien,
            titre: m.titre,
            description: m.description,
            prix_gnf: m.prix_gnf,
            quartier: m.quartier,
            adresse_complete: m.adresse_complete,
            superficie_m2: m.superficie_m2,
            nombre_chambres: m.nombre_chambres,
            nombre_salons: m.nombre_salons,
            caution_mois: m.caution_mois,
            equipements: m.equipements,
            photos: m.photos,
            statut: m.statut,
            nombre_vues: m.nombre_vues,
            options_premium: m.options_premium,
            date_publication: m.date_publication,
            date_expiration: m.date_expiration,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Pagination {
    pub page: u32,
    pub per_page: u32,
    pub total: u64,
    pub total_pages: u32,
}

#[derive(Debug, Serialize)]
pub struct ListingSearchResponse {
    pub listings: Vec<ListingResponse>,
    pub pagination: Pagination,
}

/// Create-listing payload (FR-011). Mandatory fields validated by `ValidatedJson`.
///
/// NOTE (spec discrepancy): FR-011 states titre 50-100 and description 200-2000
/// chars, but the US1 example title is 29 chars. We use pragmatic minimums
/// (titre ≥ 5, description ≥ 20) with the FR-011 maximums; tighten if desired.
#[derive(Debug, Deserialize, Validate)]
pub struct CreateListingRequest {
    pub type_operation: TypeOperation,
    pub type_bien: TypeBien,
    #[validate(length(min = 5, max = 100, message = "titre : 5 à 100 caractères"))]
    pub titre: String,
    #[validate(length(min = 20, max = 2000, message = "description : 20 à 2000 caractères"))]
    pub description: String,
    #[validate(range(min = 1, message = "prix invalide"))]
    pub prix_gnf: i64,
    pub quartier: Quartier,
    #[validate(length(max = 500))]
    pub adresse_complete: Option<String>,
    #[validate(range(min = 1))]
    pub superficie_m2: Option<i32>,
    #[validate(range(min = 0, max = 50))]
    pub nombre_chambres: Option<i32>,
    #[validate(range(min = 0, max = 20))]
    pub nombre_salons: Option<i32>,
    #[validate(range(min = 1, max = 6, message = "caution : 1 à 6 mois"))]
    pub caution_mois: Option<i32>,
    pub equipements: Option<Vec<String>>,
}

/// Response after uploading photos to a listing.
#[derive(Debug, Serialize)]
pub struct PhotoUploadResponse {
    pub count: usize,
    pub photos: serde_json::Value,
}

/// Update-listing payload (FR-013): only titre and description are editable —
/// prix, quartier and type are immutable; photos have their own endpoint.
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateListingRequest {
    #[validate(length(min = 5, max = 100, message = "titre : 5 à 100 caractères"))]
    pub titre: Option<String>,
    #[validate(length(min = 20, max = 2000, message = "description : 20 à 2000 caractères"))]
    pub description: Option<String>,
}