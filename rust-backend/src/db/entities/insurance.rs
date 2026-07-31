use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{StatutAssurance, TypeAssurance};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "insurances")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub utilisateur_id: Uuid,
    #[sea_orm(unique)]
    pub contrat_id: Uuid,
    pub type_assurance: TypeAssurance,
    #[sea_orm(unique)]
    pub numero_police: String,
    pub prime_mensuelle_gnf: i32,
    pub couvertures: Json,
    pub plafonds: Json,
    pub statut: StatutAssurance,
    pub date_souscription: DateTimeWithTimeZone,
    pub date_expiration: DateTimeWithTimeZone,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
