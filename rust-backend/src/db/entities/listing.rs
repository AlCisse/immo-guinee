use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::{Quartier, StatutListing, TypeBien, TypeOperation};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "listings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub createur_id: Uuid,
    pub type_operation: TypeOperation,
    pub type_bien: TypeBien,
    pub titre: String,
    pub description: String,
    pub prix_gnf: i64,
    pub quartier: Quartier,
    pub adresse_complete: Option<String>,
    pub superficie_m2: Option<i32>,
    pub nombre_chambres: Option<i32>,
    pub nombre_salons: Option<i32>,
    pub caution_mois: Option<i32>,
    pub equipements: Json,
    pub photos: Json,
    pub statut: StatutListing,
    pub nombre_vues: i32,
    pub options_premium: Json,
    pub date_publication: DateTimeWithTimeZone,
    pub date_derniere_maj: Option<DateTimeWithTimeZone>,
    pub date_expiration: DateTimeWithTimeZone,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
