use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{Badge, StatutCompte, StatutVerification, TypeCompte};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub telephone: String,
    pub email: Option<String>,
    #[serde(skip_serializing)]
    pub mot_de_passe_hash: String,
    pub nom_complet: String,
    pub photo_profil_url: Option<String>,
    pub bio: Option<String>,
    pub type_compte: TypeCompte,
    pub badge_certification: Badge,
    pub statut_verification: StatutVerification,
    pub statut_compte: StatutCompte,
    pub note_moyenne: f32,
    pub nombre_transactions: i32,
    pub nombre_litiges: i32,
    pub preferences_notification: Json,
    pub date_inscription: DateTimeWithTimeZone,
    pub derniere_connexion: Option<DateTimeWithTimeZone>,
    pub date_suppression: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
