use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE ratings (
        id                 UUID PRIMARY KEY,
        evaluateur_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        evalue_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id     UUID UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        note_globale       SMALLINT NOT NULL,
        critere_1_note     SMALLINT NOT NULL,
        critere_2_note     SMALLINT NOT NULL,
        critere_3_note     SMALLINT NOT NULL,
        commentaire        VARCHAR(500) NOT NULL,
        statut_moderation  statut_verification_doc NOT NULL DEFAULT 'EN_ATTENTE',
        mots_cles_detectes JSONB NOT NULL DEFAULT '[]',
        date_creation      TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_publication   TIMESTAMPTZ,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_ratings_evalue     ON ratings(evalue_id);
    CREATE INDEX idx_ratings_note       ON ratings(note_globale);
    CREATE INDEX idx_ratings_moderation ON ratings(statut_moderation);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS ratings;";

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
