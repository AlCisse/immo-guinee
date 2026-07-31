//! Request/response DTOs for the visits domain (US10 — visit scheduling).
//!
//! The `visits` table models a visit request between two users (demandeur →
//! proprietaire) for a listing, with a single `date_visite` timestamp. The frontend
//! works with a booking shape (client contact + separate date/time/duration), so the
//! response derives `client_*` from the requester and splits the timestamp; `create`
//! recombines them.

use sea_orm::entity::prelude::DateTimeWithTimeZone;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::db::entities::sea_orm_active_enums::StatutVisite;
use crate::db::entities::{listing, user, visit};

pub use crate::extractors::Envelope;

#[derive(Debug, Serialize)]
pub struct ListingBrief {
    pub id: Uuid,
    pub titre: String,
    pub quartier: String,
}

/// Visit shape the frontend agenda/booking UI reads.
#[derive(Debug, Serialize)]
pub struct VisitResponse {
    pub id: Uuid,
    pub statut: StatutVisite,
    pub date_visite: String, // YYYY-MM-DD
    pub heure_visite: String, // HH:MM
    pub duree_minutes: i32,
    pub client_nom: String,
    pub client_telephone: String,
    pub notes: Option<String>,
    pub listing: Option<ListingBrief>,
    pub listing_titre: Option<String>,
    pub date_creation: DateTimeWithTimeZone,
    pub date_confirmation: Option<DateTimeWithTimeZone>,
}

impl VisitResponse {
    /// Build from a visit joined with its listing and the requester (demandeur).
    pub fn build(v: visit::Model, l: Option<&listing::Model>, demandeur: Option<&user::Model>) -> Self {
        let dt = v.date_visite;
        Self {
            id: v.id,
            statut: v.statut,
            date_visite: dt.format("%Y-%m-%d").to_string(),
            heure_visite: dt.format("%H:%M").to_string(),
            duree_minutes: 30, // not stored; sensible default
            client_nom: demandeur.map(|u| u.nom_complet.clone()).unwrap_or_default(),
            client_telephone: demandeur.map(|u| u.telephone.clone()).unwrap_or_default(),
            notes: v.message,
            listing: l.map(|l| ListingBrief {
                id: l.id,
                titre: l.titre.clone(),
                quartier: format!("{:?}", l.quartier),
            }),
            listing_titre: l.map(|l| l.titre.clone()),
            date_creation: v.date_creation,
            date_confirmation: v.date_confirmation,
        }
    }
}

/// Booking payload from the listing detail page / agenda.
#[derive(Debug, Deserialize, Validate)]
pub struct CreateVisitRequest {
    pub listing_id: Uuid,
    // client_nom/telephone/email describe the requester; the visit is stored against
    // the authenticated user, so these are accepted but not persisted separately.
    pub client_nom: Option<String>,
    pub client_telephone: Option<String>,
    pub client_email: Option<String>,
    #[validate(length(min = 10, max = 10, message = "date attendue: YYYY-MM-DD"))]
    pub date_visite: String,
    #[validate(length(min = 4, max = 5, message = "heure attendue: HH:MM"))]
    pub heure_visite: String,
    pub duree_minutes: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CancelRequest {
    pub motif: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VisitStats {
    pub total: u64,
    pub en_attente: u64,
    pub confirmees: u64,
    pub completees: u64,
    pub annulees: u64,
}
