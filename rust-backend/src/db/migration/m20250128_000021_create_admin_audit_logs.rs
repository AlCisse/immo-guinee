//! Admin audit trail. One row per staff mutation (moderation, account changes,
//! role assignment, dispute resolution, certification verification), surfaced by
//! `GET /api/admin/logs`.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE admin_audit_logs (
        id          UUID PRIMARY KEY,
        admin_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action      TEXT NOT NULL,
        target_type TEXT,
        target_id   UUID,
        details     JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_admin_audit_created ON admin_audit_logs(created_at DESC);
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP).await?;
        Ok(())
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS admin_audit_logs;")
            .await?;
        Ok(())
    }
}
