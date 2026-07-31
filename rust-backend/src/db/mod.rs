//! Database layer (SeaORM on SQLx, PostgreSQL).
//!
//! The schema is owned by the Rust migrations (`sea-orm-migration`) — they are the
//! single source of truth (see specs/001-immog-platform/data-model.md).
//!
//! Layout:
//!   db/migration/    — sea-orm-migration (enums + 13 tables)
//!   db/entities/     — SeaORM entities (hand-written or `sea-orm-cli generate entity`)
//!   db/scopes.rs     — reusable query filters (active/available/…) replacing Eloquent scopes

pub mod entities;
pub mod migration;
// pub mod scopes;
