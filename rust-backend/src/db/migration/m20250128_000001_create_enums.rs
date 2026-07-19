use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TYPE badge AS ENUM ('BRONZE', 'ARGENT', 'OR', 'DIAMANT');
    CREATE TYPE type_compte AS ENUM ('PARTICULIER', 'AGENCE', 'DIASPORA');
    CREATE TYPE statut_verification AS ENUM ('NON_VERIFIE', 'CNI_VERIFIEE', 'TITRE_FONCIER_VERIFIE');
    CREATE TYPE statut_compte AS ENUM ('ACTIF', 'SUSPENDU', 'BANNI', 'SUPPRIME');
    CREATE TYPE type_operation AS ENUM ('LOCATION', 'VENTE');
    CREATE TYPE type_bien AS ENUM ('VILLA', 'APPARTEMENT', 'STUDIO', 'TERRAIN', 'COMMERCE', 'BUREAU', 'ENTREPOT');
    CREATE TYPE quartier AS ENUM ('KALOUM', 'DIXINN', 'RATOMA', 'MATAM', 'MATOTO', 'DUBREKA_CENTRE', 'DUBREKA_PERIPHERIE', 'COYAH_CENTRE', 'COYAH_PERIPHERIE');
    CREATE TYPE statut_listing AS ENUM ('DISPONIBLE', 'EN_NEGOCIATION', 'LOUE_VENDU', 'EXPIRE', 'ARCHIVE', 'SUSPENDU');
    CREATE TYPE type_contrat AS ENUM ('BAIL_LOCATION_RESIDENTIEL', 'BAIL_LOCATION_COMMERCIAL', 'PROMESSE_VENTE_TERRAIN', 'MANDAT_GESTION', 'ATTESTATION_CAUTION');
    CREATE TYPE statut_contrat AS ENUM ('BROUILLON', 'EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE', 'SIGNE_ARCHIVE', 'ANNULE');
    CREATE TYPE type_paiement AS ENUM ('CAUTION', 'LOYER_MENSUEL', 'COMMISSION_PLATEFORME', 'VENTE', 'FRAIS_PREMIUM');
    CREATE TYPE methode_paiement AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'ESPECES', 'VIREMENT_BANCAIRE');
    CREATE TYPE statut_paiement AS ENUM ('INITIE', 'EN_ATTENTE_OTP', 'EN_ESCROW', 'COMMISSION_COLLECTEE', 'CONFIRME', 'ECHOUE', 'REMBOURSE');
    CREATE TYPE type_document AS ENUM ('CNI', 'TITRE_FONCIER', 'PASSEPORT');
    CREATE TYPE statut_verification_doc AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');
    CREATE TYPE type_message AS ENUM ('TEXTE', 'VOCAL', 'PHOTO', 'LOCALISATION_GPS');
    CREATE TYPE statut_lecture AS ENUM ('ENVOYE', 'LIVRE', 'LU');
    CREATE TYPE statut_conversation AS ENUM ('ACTIVE', 'ARCHIVEE');
    CREATE TYPE type_litige AS ENUM ('IMPAYE', 'DEGATS', 'EXPULSION_ABUSIVE', 'CAUTION_NON_REMBOURSEE', 'AUTRE');
    CREATE TYPE statut_litige AS ENUM ('OUVERT', 'EN_COURS', 'RESOLU_AMIABLE', 'RESOLU_COMPENSATION', 'ECHOUE_ESCALADE');
    CREATE TYPE type_assurance AS ENUM ('SEJOUR_SEREIN', 'LOYER_GARANTI');
    CREATE TYPE statut_assurance AS ENUM ('ACTIVE', 'RESILIEE', 'SUSPENDUE');
    CREATE TYPE statut_transaction AS ENUM ('EN_COURS', 'COMPLETEE', 'ANNULEE');
    CREATE TYPE statut_visite AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'COMPLETEE', 'ANNULEE');
"#;

const DOWN: &str = r#"
    DROP TYPE IF EXISTS statut_visite;
    DROP TYPE IF EXISTS statut_transaction;
    DROP TYPE IF EXISTS statut_assurance;
    DROP TYPE IF EXISTS type_assurance;
    DROP TYPE IF EXISTS statut_litige;
    DROP TYPE IF EXISTS type_litige;
    DROP TYPE IF EXISTS statut_conversation;
    DROP TYPE IF EXISTS statut_lecture;
    DROP TYPE IF EXISTS type_message;
    DROP TYPE IF EXISTS statut_verification_doc;
    DROP TYPE IF EXISTS type_document;
    DROP TYPE IF EXISTS statut_paiement;
    DROP TYPE IF EXISTS methode_paiement;
    DROP TYPE IF EXISTS type_paiement;
    DROP TYPE IF EXISTS statut_contrat;
    DROP TYPE IF EXISTS type_contrat;
    DROP TYPE IF EXISTS statut_listing;
    DROP TYPE IF EXISTS quartier;
    DROP TYPE IF EXISTS type_bien;
    DROP TYPE IF EXISTS type_operation;
    DROP TYPE IF EXISTS statut_compte;
    DROP TYPE IF EXISTS statut_verification;
    DROP TYPE IF EXISTS type_compte;
    DROP TYPE IF EXISTS badge;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(DOWN).await?;
        Ok(())
    }
}
