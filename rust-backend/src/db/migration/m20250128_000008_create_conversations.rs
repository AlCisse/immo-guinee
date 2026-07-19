use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE conversations (
        id                   UUID PRIMARY KEY,
        annonce_id           UUID,
        participant_1_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant_2_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        numeros_partages     BOOLEAN NOT NULL DEFAULT false,
        statut               statut_conversation NOT NULL DEFAULT 'ACTIVE',
        date_creation        TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_dernier_message TIMESTAMPTZ,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (participant_1_id, participant_2_id, annonce_id)
    );
    CREATE INDEX idx_conversations_p1          ON conversations(participant_1_id);
    CREATE INDEX idx_conversations_p2          ON conversations(participant_2_id);
    CREATE INDEX idx_conversations_dernier_msg ON conversations(date_dernier_message);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS conversations;";

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
