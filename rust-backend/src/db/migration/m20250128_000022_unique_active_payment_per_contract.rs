//! DB-level guard: at most one *active* payment per contract. The application-level
//! `assert_no_active_payment` check is a check-then-insert TOCTOU (two concurrent
//! `process`/`cash` calls both pass it). This partial unique index makes the
//! invariant enforceable by Postgres: a second payment for the same `contrat_id` in
//! an active statut (anything but ECHOUE/REMBOURSE) is rejected. `contrat_id` is
//! nullable, and NULLs are distinct in a unique index, so payments with no contract
//! are unaffected.

use sea_orm::TransactionTrait;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_contrat_active
        ON payments (contrat_id)
        WHERE statut NOT IN ('ECHOUE', 'REMBOURSE');
"#;

const DOWN: &str = "DROP INDEX IF EXISTS uq_payments_contrat_active;";

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // C12 — wrapper dans une transaction : si le CREATE UNIQUE INDEX échoue
        // (ex. doublons pré-existants dans payments), la migration est roulée
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