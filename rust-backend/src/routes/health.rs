//! Health endpoints (replaces Laravel /health + /health/live probes).
//!
//! `/api/health` — liveness + readiness (checks DB + Redis).
//! `/api/health/live` — cheap liveness (process alive).

use std::sync::Arc;
use std::time::Duration;

use axum::extract::State;
use axum::routing::{get, Router};
use axum::Json;
use serde_json::{json, Value};
use sea_orm::ConnectionTrait;

use crate::error::AppResult;
use crate::state::AppState;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health))
        .route("/health/live", get(liveness))
}

async fn health(State(state): State<Arc<AppState>>) -> AppResult<Json<Value>> {
    let db_ok = check_db(&state).await;
    let redis_ok = check_redis(&state).await;
    let status = if db_ok && redis_ok { "ok" } else { "degraded" };

    Ok(Json(json!({
        "status": status,
        "service": "immog-backend",
        "version": env!("CARGO_PKG_VERSION"),
        "checks": { "db": db_ok, "redis": redis_ok },
    })))
}

async fn liveness() -> Json<Value> {
    Json(json!({ "status": "alive" }))
}

async fn check_db(state: &AppState) -> bool {
    match tokio::time::timeout(Duration::from_secs(3), state.db.execute_unprepared("SELECT 1")).await {
        Ok(Ok(_)) => true,
        _ => false,
    }
}

async fn check_redis(state: &AppState) -> bool {
    let mut conn = state.redis.clone();
    let cmd = redis::cmd("PING");
    let ping = cmd.query_async::<String>(&mut conn);
    match tokio::time::timeout(Duration::from_secs(3), ping).await {
        Ok(Ok(s)) if s == "PONG" => true,
        _ => false,
    }
}