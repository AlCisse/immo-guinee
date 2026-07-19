use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::StatutVisite;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "visits")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub annonce_id: Uuid,
    pub demandeur_id: Uuid,
    pub proprietaire_id: Uuid,
    pub date_visite: DateTimeWithTimeZone,
    pub statut: StatutVisite,
    pub message: Option<String>,
    #[sea_orm(unique)]
    pub lien_public_token: Option<String>,
    pub date_creation: DateTimeWithTimeZone,
    pub date_confirmation: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
