use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE listings (
        id                UUID PRIMARY KEY,
        createur_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type_operation    type_operation NOT NULL,
        type_bien         type_bien NOT NULL,
        titre             VARCHAR(100) NOT NULL,
        description       VARCHAR(2000) NOT NULL,
        prix_gnf          BIGINT NOT NULL,
        quartier          quartier NOT NULL,
        adresse_complete  VARCHAR(500),
        superficie_m2     INTEGER,
        nombre_chambres   INTEGER,
        nombre_salons     INTEGER,
        caution_mois      INTEGER,
        equipements       JSONB NOT NULL DEFAULT '[]',
        photos            JSONB NOT NULL DEFAULT '[]',
        statut            statut_listing NOT NULL DEFAULT 'DISPONIBLE',
        nombre_vues       INTEGER NOT NULL DEFAULT 0,
        options_premium   JSONB NOT NULL DEFAULT '{"badge_urgent":false,"remontee_48h":false,"photos_pro":false}',
        date_publication  TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_derniere_maj TIMESTAMPTZ,
        date_expiration   TIMESTAMPTZ NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_listings_quartier_statut ON listings(quartier, statut);
    CREATE INDEX idx_listings_typebien_statut ON listings(type_bien, statut);
    CREATE INDEX idx_listings_prix_statut     ON listings(prix_gnf, statut);
    CREATE INDEX idx_listings_date_pub        ON listings(date_publication);
    CREATE INDEX idx_listings_nombre_vues     ON listings(nombre_vues);
    CREATE INDEX listings_fulltext_idx ON listings USING GIN(to_tsvector('french', titre || ' ' || description));
"#;

const DOWN: &str = "DROP TABLE IF EXISTS listings;";

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
