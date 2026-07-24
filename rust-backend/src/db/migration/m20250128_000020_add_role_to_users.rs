//! Add an explicit `role` to users (nullable). When NULL the role is derived
//! from `type_compte` (chercheur / agence); when set it overrides that derivation
//! — this is how staff roles (admin / moderator / mediator) are assigned, since
//! they cannot be inferred from the account type.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NULL;")
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE users DROP COLUMN IF EXISTS role;")
            .await?;
        Ok(())
    }
}
