use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::StatutVerificationDoc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "ratings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub evaluateur_id: Uuid,
    pub evalue_id: Uuid,
    #[sea_orm(unique)]
    pub transaction_id: Uuid,
    pub note_globale: i16,
    pub critere_1_note: i16,
    pub critere_2_note: i16,
    pub critere_3_note: i16,
    pub commentaire: String,
    pub statut_moderation: StatutVerificationDoc,
    pub mots_cles_detectes: Json,
    pub date_creation: DateTimeWithTimeZone,
    pub date_publication: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
