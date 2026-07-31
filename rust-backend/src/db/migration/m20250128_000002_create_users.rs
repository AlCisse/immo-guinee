use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE users (
        id                       UUID PRIMARY KEY,
        telephone                VARCHAR(20) UNIQUE NOT NULL,
        email                    VARCHAR(255),
        mot_de_passe_hash        VARCHAR(255) NOT NULL,
        nom_complet              VARCHAR(255) NOT NULL,
        photo_profil_url         TEXT,
        bio                      VARCHAR(500),
        type_compte              type_compte NOT NULL DEFAULT 'PARTICULIER',
        badge_certification      badge NOT NULL DEFAULT 'BRONZE',
        statut_verification      statut_verification NOT NULL DEFAULT 'NON_VERIFIE',
        statut_compte            statut_compte NOT NULL DEFAULT 'ACTIF',
        note_moyenne             REAL NOT NULL DEFAULT 0,
        nombre_transactions      INTEGER NOT NULL DEFAULT 0,
        nombre_litiges           INTEGER NOT NULL DEFAULT 0,
        preferences_notification JSONB NOT NULL DEFAULT '{"push":true,"sms":true,"email":true,"whatsapp":false}',
        date_inscription         TIMESTAMPTZ NOT NULL DEFAULT now(),
        derniere_connexion       TIMESTAMPTZ,
        date_suppression         TIMESTAMPTZ,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_users_telephone           ON users(telephone);
    CREATE INDEX idx_users_badge_certification ON users(badge_certification);
    CREATE INDEX idx_users_note_moyenne        ON users(note_moyenne);
    CREATE INDEX idx_users_statut_compte       ON users(statut_compte);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS users;";

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
