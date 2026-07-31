//! Rust mappings of the PostgreSQL native enum types (see create_enums migration).
//! Each maps 1:1 to a `CREATE TYPE ... AS ENUM (...)`.

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

macro_rules! pg_enum {
    ($name:literal, $rust:ident { $($variant:ident => $val:literal),+ $(,)? }) => {
        #[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
        #[sea_orm(rs_type = "String", db_type = "Enum", enum_name = $name)]
        // JSON uses the DB string values (e.g. `KALOUM`), matching the API contract.
        // SCREAMING_SNAKE_CASE of each PascalCase variant equals its `string_value`.
        #[serde(rename_all = "SCREAMING_SNAKE_CASE")]
        pub enum $rust {
            $( #[sea_orm(string_value = $val)] $variant ),+
        }
    };
}

pg_enum!("badge", Badge { Bronze => "BRONZE", Argent => "ARGENT", Or => "OR", Diamant => "DIAMANT" });
pg_enum!("type_compte", TypeCompte { Particulier => "PARTICULIER", Agence => "AGENCE", Diaspora => "DIASPORA" });
pg_enum!("statut_verification", StatutVerification { NonVerifie => "NON_VERIFIE", CniVerifiee => "CNI_VERIFIEE", TitreFoncierVerifie => "TITRE_FONCIER_VERIFIE" });
pg_enum!("statut_compte", StatutCompte { Actif => "ACTIF", Suspendu => "SUSPENDU", Banni => "BANNI", Supprime => "SUPPRIME" });
pg_enum!("type_operation", TypeOperation { Location => "LOCATION", LocationCourte => "LOCATION_COURTE", Vente => "VENTE" });
pg_enum!("type_bien", TypeBien { Villa => "VILLA", Appartement => "APPARTEMENT", Studio => "STUDIO", Terrain => "TERRAIN", Commerce => "COMMERCE", Bureau => "BUREAU", Entrepot => "ENTREPOT" });
pg_enum!("quartier", Quartier {
    Kaloum => "KALOUM", Dixinn => "DIXINN", Ratoma => "RATOMA", Matam => "MATAM", Matoto => "MATOTO",
    DubrekaCentre => "DUBREKA_CENTRE", DubrekaPeripherie => "DUBREKA_PERIPHERIE",
    CoyahCentre => "COYAH_CENTRE", CoyahPeripherie => "COYAH_PERIPHERIE"
});
pg_enum!("statut_listing", StatutListing { Disponible => "DISPONIBLE", EnNegociation => "EN_NEGOCIATION", LoueVendu => "LOUE_VENDU", Expire => "EXPIRE", Archive => "ARCHIVE", Suspendu => "SUSPENDU" });
pg_enum!("type_contrat", TypeContrat { BailLocationResidentiel => "BAIL_LOCATION_RESIDENTIEL", BailLocationCommercial => "BAIL_LOCATION_COMMERCIAL", PromesseVenteTerrain => "PROMESSE_VENTE_TERRAIN", MandatGestion => "MANDAT_GESTION", AttestationCaution => "ATTESTATION_CAUTION" });
pg_enum!("statut_contrat", StatutContrat { Brouillon => "BROUILLON", EnAttenteSignature => "EN_ATTENTE_SIGNATURE", PartiellementSigne => "PARTIELLEMENT_SIGNE", SigneArchive => "SIGNE_ARCHIVE", Annule => "ANNULE" });
pg_enum!("type_paiement", TypePaiement { Caution => "CAUTION", LoyerMensuel => "LOYER_MENSUEL", CommissionPlateforme => "COMMISSION_PLATEFORME", Vente => "VENTE", FraisPremium => "FRAIS_PREMIUM" });
pg_enum!("methode_paiement", MethodePaiement { OrangeMoney => "ORANGE_MONEY", MtnMomo => "MTN_MOMO", Especes => "ESPECES", VirementBancaire => "VIREMENT_BANCAIRE" });
pg_enum!("statut_paiement", StatutPaiement { Initie => "INITIE", EnAttenteOtp => "EN_ATTENTE_OTP", EnEscrow => "EN_ESCROW", CommissionCollectee => "COMMISSION_COLLECTEE", Confirme => "CONFIRME", Echoue => "ECHOUE", Rembourse => "REMBOURSE" });
pg_enum!("type_document", TypeDocument { Cni => "CNI", TitreFoncier => "TITRE_FONCIER", Passeport => "PASSEPORT" });
pg_enum!("statut_verification_doc", StatutVerificationDoc { EnAttente => "EN_ATTENTE", Approuve => "APPROUVE", Rejete => "REJETE" });
pg_enum!("type_message", TypeMessage { Texte => "TEXTE", Vocal => "VOCAL", Photo => "PHOTO", LocalisationGps => "LOCALISATION_GPS" });
pg_enum!("statut_lecture", StatutLecture { Envoye => "ENVOYE", Livre => "LIVRE", Lu => "LU" });
pg_enum!("statut_conversation", StatutConversation { Active => "ACTIVE", Archivee => "ARCHIVEE" });
pg_enum!("type_litige", TypeLitige { Impaye => "IMPAYE", Degats => "DEGATS", ExpulsionAbusive => "EXPULSION_ABUSIVE", CautionNonRemboursee => "CAUTION_NON_REMBOURSEE", Autre => "AUTRE" });
pg_enum!("statut_litige", StatutLitige { Ouvert => "OUVERT", EnCours => "EN_COURS", ResoluAmiable => "RESOLU_AMIABLE", ResoluCompensation => "RESOLU_COMPENSATION", EchoueEscalade => "ECHOUE_ESCALADE" });
pg_enum!("type_assurance", TypeAssurance { SejourSerein => "SEJOUR_SEREIN", LoyerGaranti => "LOYER_GARANTI" });
pg_enum!("statut_assurance", StatutAssurance { Active => "ACTIVE", Resiliee => "RESILIEE", Suspendue => "SUSPENDUE" });
pg_enum!("statut_transaction", StatutTransaction { EnCours => "EN_COURS", Completee => "COMPLETEE", Annulee => "ANNULEE" });
pg_enum!("statut_visite", StatutVisite { EnAttente => "EN_ATTENTE", Confirmee => "CONFIRMEE", Completee => "COMPLETEE", Annulee => "ANNULEE" });
