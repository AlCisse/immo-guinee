//! DB-level guard: at most one *active* contract per listing. The application-level
//! check in `contracts::create` is a check-then-insert TOCTOU whose window spans
//! the Typst render + S3 put, so two concurrent `POST /contracts` on the same
//! listing both pass it. This partial unique index makes Postgres enforce the
//! invariant: a second non-ANNULE contract for the same `annonce_id` is rejected.
//! `annonce_id` is nullable, and NULLs are distinct in a unique index, so contracts
//! with no listing are unaffected.

use sea_orm::TransactionTrait;
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
        // C12 — wrapper dans une transaction : si le CREATE UNIQUE INDEX échoue
        // (ex. doublons pré-existants dans contracts), la migration est roulée
        // back et n'est pas marquée appliquée à moitié. Postgres supporte le DDL
        // transactionnel, donc l'index est créé ou annulé atomiquement.
        let txn = manager.get_connection().begin().await?;
        if let Err(e) = txn.execute_unprepared(UP).await {
            let _ = txn.rollback().await;
            return Err(e);
        }
        txn.commit().await?;
        Ok(())
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let txn = manager.get_connection().begin().await?;
        if let Err(e) = txn.execute_unprepared(DOWN).await {
            let _ = txn.rollback().await;
            return Err(e);
        }
        txn.commit().await?;
        Ok(())
    }
}