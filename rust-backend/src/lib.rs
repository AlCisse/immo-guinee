//! ImmoGuinée backend — library crate.
//!
//! Exposes the application modules so both binaries (`immog-backend` server and
//! `immog-migrate`) share the same code (config, DB layer, migrations, routes…).

#![allow(dead_code)] // scaffolding: modules defined ahead of the phase that uses them

pub mod auth;
pub mod config;
pub mod db;
pub mod domain;
pub mod error;
pub mod extractors;
pub mod jobs;
pub mod middleware;
pub mod notifications;
pub mod routes;
pub mod services;
pub mod state;
