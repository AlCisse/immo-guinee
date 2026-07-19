use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP: &str = r#"
    CREATE TABLE payments (
        id                           UUID PRIMARY KEY,
        payeur_id                    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        beneficiaire_id              UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        contrat_id                   UUID REFERENCES contracts(id) ON DELETE SET NULL,
        type_paiement                type_paiement NOT NULL,
        montant_gnf                  BIGINT NOT NULL,
        commission_plateforme_gnf    BIGINT NOT NULL DEFAULT 0,
        montant_total_gnf            BIGINT NOT NULL,
        methode_paiement             methode_paiement NOT NULL,
        statut                       statut_paiement NOT NULL DEFAULT 'INITIE',
        numero_transaction_externe   VARCHAR(255),
        quittance_pdf_url            TEXT,
        tentatives_paiement          INTEGER NOT NULL DEFAULT 0,
        date_creation                TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_confirmation            TIMESTAMPTZ,
        date_validation_beneficiaire TIMESTAMPTZ,
        date_deblocage_escrow        TIMESTAMPTZ,
        created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_payments_statut        ON payments(statut);
    CREATE INDEX idx_payments_payeur        ON payments(payeur_id);
    CREATE INDEX idx_payments_beneficiaire  ON payments(beneficiaire_id);
    CREATE INDEX idx_payments_contrat       ON payments(contrat_id);
    CREATE INDEX idx_payments_date_creation ON payments(date_creation);
"#;

const DOWN: &str = "DROP TABLE IF EXISTS payments;";

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
