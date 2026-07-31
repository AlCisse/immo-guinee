//! Add `LOCATION_COURTE` (short-term rental) to the `type_operation` enum so it is
//! distinct from long-term `LOCATION` in search and listings.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("ALTER TYPE type_operation ADD VALUE IF NOT EXISTS 'LOCATION_COURTE';")
            .await?;
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // PostgreSQL cannot remove a value from an enum type — no-op.
        Ok(())
    }
}
