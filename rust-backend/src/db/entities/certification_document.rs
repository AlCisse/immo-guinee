use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{StatutVerificationDoc, TypeDocument};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "certification_documents")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub utilisateur_id: Uuid,
    pub type_document: TypeDocument,
    pub fichier_url: String,
    pub statut_verification: StatutVerificationDoc,
    pub commentaire_verification: Option<String>,
    pub verifie_par_admin_id: Option<Uuid>,
    pub date_upload: DateTimeWithTimeZone,
    pub date_verification: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
