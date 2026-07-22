//! Favorites: a user's saved listings (FR — saved searches/favourites).

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE TABLE IF NOT EXISTS favorites (
                    id          UUID PRIMARY KEY,
                    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE (user_id, listing_id)
                );
                CREATE INDEX IF NOT EXISTS favorites_user_idx ON favorites (user_id);
                "#,
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS favorites;")
            .await?;
        Ok(())
    }
}
