use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE contracts (
        id                        UUID PRIMARY KEY,
        type_contrat              type_contrat NOT NULL,
        annonce_id                UUID REFERENCES listings(id) ON DELETE SET NULL,
        proprietaire_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        locataire_acheteur_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        donnees_personnalisees    JSONB NOT NULL,
        statut                    statut_contrat NOT NULL DEFAULT 'BROUILLON',
        fichier_pdf_url           TEXT,
        hash_sha256               VARCHAR(64) UNIQUE,
        signatures                JSONB NOT NULL DEFAULT '[]',
        date_creation             TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_signature_complete   TIMESTAMPTZ,
        delai_retractation_expire TIMESTAMPTZ,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_contracts_statut        ON contracts(statut);
    CREATE INDEX idx_contracts_proprietaire  ON contracts(proprietaire_id);
    CREATE INDEX idx_contracts_locataire     ON contracts(locataire_acheteur_id);
    CREATE INDEX idx_contracts_date_creation ON contracts(date_creation);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS contracts;";

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
