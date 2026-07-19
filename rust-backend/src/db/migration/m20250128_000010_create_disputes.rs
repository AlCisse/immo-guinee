use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE disputes (
        id                         UUID PRIMARY KEY,
        reference                  VARCHAR(20) UNIQUE NOT NULL,
        transaction_id             UUID REFERENCES transactions(id) ON DELETE SET NULL,
        demandeur_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        defendeur_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        type_litige                type_litige NOT NULL,
        description                VARCHAR(2000) NOT NULL,
        preuves_urls               JSONB NOT NULL DEFAULT '[]',
        statut                     statut_litige NOT NULL DEFAULT 'OUVERT',
        mediateur_assigne_id       UUID,
        resolution                 JSONB,
        date_ouverture             TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_assignation_mediateur TIMESTAMPTZ,
        date_resolution            TIMESTAMPTZ,
        created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_disputes_statut    ON disputes(statut);
    CREATE INDEX idx_disputes_demandeur ON disputes(demandeur_id);
    CREATE INDEX idx_disputes_defendeur ON disputes(defendeur_id);
    CREATE INDEX idx_disputes_ouverture ON disputes(date_ouverture);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS disputes;";

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
