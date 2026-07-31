//! Add `telephone_verifie_at` to users — phone verification timestamp (FR-001).
//! Set when the user confirms the OTP sent to their phone (WhatsApp/SMS).

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone_verifie_at TIMESTAMPTZ NULL;",
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE users DROP COLUMN IF EXISTS telephone_verifie_at;")
            .await?;
        Ok(())
    }
}
