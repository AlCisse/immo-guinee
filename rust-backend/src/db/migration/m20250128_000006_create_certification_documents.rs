use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE certification_documents (
        id                       UUID PRIMARY KEY,
        utilisateur_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type_document            type_document NOT NULL,
        fichier_url              TEXT NOT NULL,
        statut_verification      statut_verification_doc NOT NULL DEFAULT 'EN_ATTENTE',
        commentaire_verification VARCHAR(500),
        verifie_par_admin_id     UUID,
        date_upload              TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_verification        TIMESTAMPTZ,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_certdocs_utilisateur ON certification_documents(utilisateur_id);
    CREATE INDEX idx_certdocs_statut      ON certification_documents(statut_verification);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS certification_documents;";

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
