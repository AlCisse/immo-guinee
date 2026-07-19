//! Integration-test harness: ephemeral Postgres + Redis + MinIO via testcontainers,
//! migrated schema, created bucket, and an `axum_test::TestServer` over the real router.

use std::sync::Arc;

use axum_test::TestServer;
use sea_orm::Database;
use sea_orm_migration::MigratorTrait;
use testcontainers::ContainerAsync;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::{minio::MinIO, postgres::Postgres, redis::Redis};

use immog_backend::config::Config;
use immog_backend::db::migration::Migrator;
use immog_backend::services::storage;
use immog_backend::state::AppState;
use immog_backend::{routes, state};

/// Owns the running containers (dropping stops them) and the test server.
pub struct TestApp {
    pub server: TestServer,
    pub state: Arc<AppState>,
    _pg: ContainerAsync<Postgres>,
    _redis: ContainerAsync<Redis>,
    _minio: ContainerAsync<MinIO>,
}

/// Spin up the stack, migrate, and return a ready `TestApp`.
pub async fn setup() -> TestApp {
    let pg = Postgres::default().start().await.expect("start postgres");
    let pg_port = pg.get_host_port_ipv4(5432).await.expect("pg port");

    let redis = Redis::default().start().await.expect("start redis");
    let redis_port = redis.get_host_port_ipv4(6379).await.expect("redis port");

    let minio = MinIO::default().start().await.expect("start minio");
    let minio_port = minio.get_host_port_ipv4(9000).await.expect("minio port");

    let cfg = Config {
        database_url: format!("postgres://postgres:postgres@127.0.0.1:{pg_port}/postgres"),
        redis_url: format!("redis://127.0.0.1:{redis_port}"),
        s3_endpoint: format!("http://127.0.0.1:{minio_port}"),
        ..Config::default()
    };

    // Schema is owned by the Rust migrations.
    let db = Database::connect(&cfg.database_url).await.expect("connect db");
    Migrator::up(&db, None).await.expect("run migrations");

    storage::ensure_bucket(&cfg).await.expect("create bucket");

    let app_state = Arc::new(state::AppState::init(&cfg).await.expect("app state"));
    let router = routes::router(app_state.clone(), &cfg);
    let server = TestServer::new(router).expect("test server");

    TestApp { server, state: app_state, _pg: pg, _redis: redis, _minio: minio }
}
