//! SeaORM entities (one module per table) + PostgreSQL enum mappings.
//!
//! Relations are intentionally left empty for now and will be added per domain
//! (a table with several FKs to `users` needs explicit `Related`/`Linked` impls
//! rather than a single derived `Relation`).

pub mod sea_orm_active_enums;

pub mod user;
pub mod listing;
pub mod visit;
pub mod favorite;
pub mod contract;
pub mod payment;
pub mod certification_document;
pub mod rating;
pub mod conversation;
pub mod message;
pub mod dispute;
pub mod transaction;
pub mod insurance;
