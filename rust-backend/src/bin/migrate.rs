//! `immog-migrate` — database migrations (single source of truth for the schema).
//!
//! Uses sea-orm-migration. The migrations under `src/db/migration/` own the
//! PostgreSQL schema described in specs/001-immog-platform/data-model.md.
//!
//! Usage:
//!   immog-migrate up          # apply pending migrations
//!   immog-migrate status      # show applied/pending
//!   immog-migrate down [n]     # revert last n migrations (default 1)
//!   immog-migrate fresh       # DEV ONLY — drop all + re-apply (never in prod)

use immog_backend::db::migration::Migrator;
use sea_orm::Database;
use sea_orm_migration::MigratorTrait;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt().with_env_filter("info").init();

    let url = std::env::var("IMMOG_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .expect("IMMOG_DATABASE_URL or DATABASE_URL must be set");

    let db = Database::connect(&url).await?;

    let subcmd = std::env::args().nth(1).unwrap_or_else(|| "status".into());
    match subcmd.as_str() {
        "up" => Migrator::up(&db, None).await?,
        "status" => Migrator::status(&db).await?,
        "down" => {
            let n = std::env::args().nth(2).and_then(|s| s.parse().ok()).unwrap_or(1);
            Migrator::down(&db, Some(n)).await?;
        }
        "fresh" => Migrator::fresh(&db).await?,
        other => {
            eprintln!("immog-migrate: unknown subcommand `{other}` (up | status | down [n] | fresh)");
            std::process::exit(2);
        }
    }
    Ok(())
}
