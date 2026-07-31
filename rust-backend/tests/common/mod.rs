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

impl TestApp {
    /// Register `phone`, mark its phone verified, and return a login access token.
    /// Login now refuses tokens to an unverified phone (FR-001, M-a), so tests that
    /// don't exercise the OTP flow itself (covered by auth_otp_e2e) verify directly.
    pub async fn register_verified_login(&self, phone: &str, password: &str) -> String {
        self.server
            .post("/api/auth/register")
            .json(&serde_json::json!({ "telephone": phone, "mot_de_passe": password, "nom_complet": "Test User" }))
            .await
            .assert_status_ok();
        self.mark_phone_verified(phone).await;
        let login = self
            .server
            .post("/api/auth/login")
            .json(&serde_json::json!({ "telephone": phone, "mot_de_passe": password }))
            .await;
        login.assert_status_ok();
        login.json::<serde_json::Value>()["data"]["access_token"]
            .as_str()
            .expect("access_token")
            .to_owned()
    }

    /// Mark a phone as verified in the DB (bypasses OTP delivery). Raw SQL keeps the
    /// helper free of a direct chrono dependency in the test crate.
    pub async fn mark_phone_verified(&self, phone: &str) {
        use sea_orm::{ConnectionTrait, DbBackend, Statement};
        self.state
            .db
            .execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                "UPDATE users SET telephone_verifie_at = now() WHERE telephone = $1",
                [phone.into()],
            ))
            .await
            .expect("mark phone verified");
    }
}
