use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{StatutLitige, TypeLitige};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "disputes")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub reference: String,
    pub transaction_id: Option<Uuid>,
    pub demandeur_id: Uuid,
    pub defendeur_id: Uuid,
    pub type_litige: TypeLitige,
    pub description: String,
    pub preuves_urls: Json,
    pub statut: StatutLitige,
    pub mediateur_assigne_id: Option<Uuid>,
    pub resolution: Option<Json>,
    pub date_ouverture: DateTimeWithTimeZone,
    pub date_assignation_mediateur: Option<DateTimeWithTimeZone>,
    pub date_resolution: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
