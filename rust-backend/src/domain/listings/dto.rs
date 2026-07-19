//! Response DTOs for the listings domain (replaces Laravel API Resources).
//!
//! Responses are wrapped in `Envelope { success, data }` to match the existing
//! API contract shape (`{ "success": true, "data": { ... } }`).

use serde::Serialize;
use sea_orm::entity::prelude::DateTimeWithTimeZone;
use uuid::Uuid;

use crate::db::entities::listing;
use crate::db::entities::sea_orm_active_enums::{Quartier, StatutListing, TypeBien, TypeOperation};

/// `{ "success": true, "data": T }` — matches the Laravel success envelope.
#[derive(Debug, Serialize)]
pub struct Envelope<T: Serialize> {
    pub success: bool,
    pub data: T,
}

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