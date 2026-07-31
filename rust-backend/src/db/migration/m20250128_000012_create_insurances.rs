use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE insurances (
        id                  UUID PRIMARY KEY,
        utilisateur_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contrat_id          UUID UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
        type_assurance      type_assurance NOT NULL,
        numero_police       VARCHAR(50) UNIQUE NOT NULL,
        prime_mensuelle_gnf INTEGER NOT NULL,
        couvertures         JSONB NOT NULL,
        plafonds            JSONB NOT NULL,
        statut              statut_assurance NOT NULL DEFAULT 'ACTIVE',
        date_souscription   TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_expiration     TIMESTAMPTZ NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_insurances_utilisateur ON insurances(utilisateur_id);
    CREATE INDEX idx_insurances_statut      ON insurances(statut);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS insurances;";

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
