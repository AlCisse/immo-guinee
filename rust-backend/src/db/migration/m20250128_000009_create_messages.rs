use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE messages (
        id                   UUID PRIMARY KEY,
        conversation_id      UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        expediteur_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type_message         type_message NOT NULL,
        contenu_texte        VARCHAR(2000),
        fichier_url          TEXT,
        localisation_lat_lng VARCHAR(50),
        horodatage           TIMESTAMPTZ NOT NULL DEFAULT now(),
        statut_lecture       statut_lecture NOT NULL DEFAULT 'ENVOYE',
        signale              BOOLEAN NOT NULL DEFAULT false,
        raison_signalement   VARCHAR(255),
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_messages_conv_horodatage ON messages(conversation_id, horodatage);
    CREATE INDEX idx_messages_expediteur      ON messages(expediteur_id);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS messages;";

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
