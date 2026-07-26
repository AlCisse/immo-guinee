//! Database migrations (`sea-orm-migration`) — single source of truth for the schema.
//!
//! Run via the `immog-migrate` binary:
//!   immog-migrate up | status | fresh(dev only)
//!
//! Migrations are ordered by data dependency (FK targets first), independently of
//! the timestamp in the file name.

use sea_orm_migration::prelude::*;

mod m20250128_000001_create_enums;
mod m20250128_000002_create_users;
mod m20250128_000003_create_listings;
mod m20250128_000004_create_contracts;
mod m20250128_000005_create_payments;
mod m20250128_000006_create_certification_documents;
mod m20250128_000011_create_transactions;
mod m20250128_000007_create_ratings;
mod m20250128_000008_create_conversations;
mod m20250128_000009_create_messages;
mod m20250128_000010_create_disputes;
mod m20250128_000012_create_insurances;
mod m20250128_000015_create_visits;
mod m20250128_000016_add_two_factor_to_users;
mod m20250128_000017_add_telephone_verifie;
mod m20250128_000018_add_location_courte;
mod m20250128_000019_create_favorites;
mod m20250128_000020_add_role_to_users;
mod m20250128_000021_create_admin_audit_logs;
mod m20250128_000022_unique_active_payment_per_contract;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250128_000001_create_enums::Migration),
            Box::new(m20250128_000002_create_users::Migration),
            Box::new(m20250128_000003_create_listings::Migration),
            Box::new(m20250128_000004_create_contracts::Migration),
            Box::new(m20250128_000005_create_payments::Migration),
            Box::new(m20250128_000006_create_certification_documents::Migration),
            // transactions before ratings/disputes (they FK transactions)
            Box::new(m20250128_000011_create_transactions::Migration),
            Box::new(m20250128_000007_create_ratings::Migration),
            Box::new(m20250128_000008_create_conversations::Migration),
            Box::new(m20250128_000009_create_messages::Migration),
            Box::new(m20250128_000010_create_disputes::Migration),
            Box::new(m20250128_000012_create_insurances::Migration),
            Box::new(m20250128_000015_create_visits::Migration),
            Box::new(m20250128_000016_add_two_factor_to_users::Migration),
            Box::new(m20250128_000017_add_telephone_verifie::Migration),
            Box::new(m20250128_000018_add_location_courte::Migration),
            Box::new(m20250128_000019_create_favorites::Migration),
            Box::new(m20250128_000020_add_role_to_users::Migration),
            Box::new(m20250128_000021_create_admin_audit_logs::Migration),
            Box::new(m20250128_000022_unique_active_payment_per_contract::Migration),
        ]
    }
}
