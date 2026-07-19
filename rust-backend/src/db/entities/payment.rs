use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{MethodePaiement, StatutPaiement, TypePaiement};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "payments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub payeur_id: Uuid,
    pub beneficiaire_id: Uuid,
    pub contrat_id: Option<Uuid>,
    pub type_paiement: TypePaiement,
    pub montant_gnf: i64,
    pub commission_plateforme_gnf: i64,
    pub montant_total_gnf: i64,
    pub methode_paiement: MethodePaiement,
    pub statut: StatutPaiement,
    pub numero_transaction_externe: Option<String>,
    pub quittance_pdf_url: Option<String>,
    pub tentatives_paiement: i32,
    pub date_creation: DateTimeWithTimeZone,
    pub date_confirmation: Option<DateTimeWithTimeZone>,
    pub date_validation_beneficiaire: Option<DateTimeWithTimeZone>,
    pub date_deblocage_escrow: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
