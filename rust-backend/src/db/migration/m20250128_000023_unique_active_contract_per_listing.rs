//! DB-level guard: at most one *active* contract per listing. The application-level
//! check in `contracts::create` is a check-then-insert TOCTOU whose window spans
//! the Typst render + S3 put, so two concurrent `POST /contracts` on the same
//! listing both pass it. This partial unique index makes Postgres enforce the
//! invariant: a second non-ANNULE contract for the same `annonce_id` is rejected.
//! `annonce_id` is nullable, and NULLs are distinct in a unique index, so contracts
//! with no listing are unaffected.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_annonce_active
        ON contracts (annonce_id)
        WHERE statut <> 'ANNULE';
"#;

const DOWN: &str = "DROP INDEX IF EXISTS uq_contracts_annonce_active;";

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