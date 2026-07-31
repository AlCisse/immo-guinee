use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{StatutTransaction, TypeOperation};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "transactions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub annonce_id: Option<Uuid>,
    pub proprietaire_id: Uuid,
    pub locataire_acheteur_id: Uuid,
    #[sea_orm(unique)]
    pub contrat_id: Uuid,
    pub paiements_ids: Json,
    pub type_transaction: TypeOperation,
    pub montant_total_gnf: i64,
    pub commission_plateforme_gnf: i64,
    pub statut: StatutTransaction,
    pub date_debut: DateTimeWithTimeZone,
    pub date_completion: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
