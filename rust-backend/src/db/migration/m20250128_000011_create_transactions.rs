use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE transactions (
        id                        UUID PRIMARY KEY,
        annonce_id                UUID,
        proprietaire_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        locataire_acheteur_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        contrat_id                UUID UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
        paiements_ids             JSONB NOT NULL DEFAULT '[]',
        type_transaction          type_operation NOT NULL,
        montant_total_gnf         BIGINT NOT NULL,
        commission_plateforme_gnf BIGINT NOT NULL,
        statut                    statut_transaction NOT NULL DEFAULT 'EN_COURS',
        date_debut                TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_completion           TIMESTAMPTZ,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_transactions_proprietaire ON transactions(proprietaire_id);
    CREATE INDEX idx_transactions_locataire    ON transactions(locataire_acheteur_id);
    CREATE INDEX idx_transactions_statut       ON transactions(statut);
    CREATE INDEX idx_transactions_completion   ON transactions(date_completion);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS transactions;";

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
