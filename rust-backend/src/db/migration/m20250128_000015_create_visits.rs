use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE visits (
        id                UUID PRIMARY KEY,
        annonce_id        UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        demandeur_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        proprietaire_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date_visite       TIMESTAMPTZ NOT NULL,
        statut            statut_visite NOT NULL DEFAULT 'EN_ATTENTE',
        message           VARCHAR(500),
        lien_public_token VARCHAR(64) UNIQUE,
        date_creation     TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_confirmation TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_visits_annonce      ON visits(annonce_id);
    CREATE INDEX idx_visits_demandeur    ON visits(demandeur_id);
    CREATE INDEX idx_visits_proprietaire ON visits(proprietaire_id);
    CREATE INDEX idx_visits_statut       ON visits(statut);
    CREATE INDEX idx_visits_date         ON visits(date_visite);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS visits;";

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
