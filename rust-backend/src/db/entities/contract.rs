use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{StatutContrat, TypeContrat};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contracts")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub type_contrat: TypeContrat,
    pub annonce_id: Option<Uuid>,
    pub proprietaire_id: Uuid,
    pub locataire_acheteur_id: Uuid,
    pub donnees_personnalisees: Json,
    pub statut: StatutContrat,
    pub fichier_pdf_url: Option<String>,
    #[sea_orm(unique)]
    pub hash_sha256: Option<String>,
    pub signatures: Json,
    pub date_creation: DateTimeWithTimeZone,
    pub date_signature_complete: Option<DateTimeWithTimeZone>,
    pub delai_retractation_expire: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
