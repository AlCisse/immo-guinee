use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{StatutLecture, TypeMessage};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "messages")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub expediteur_id: Uuid,
    pub type_message: TypeMessage,
    pub contenu_texte: Option<String>,
    pub fichier_url: Option<String>,
    pub localisation_lat_lng: Option<String>,
    pub horodatage: DateTimeWithTimeZone,
    pub statut_lecture: StatutLecture,
    pub signale: bool,
    pub raison_signalement: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
