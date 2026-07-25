//! Native Redis rate limiter (fixed window) — FR-087 + auth brute-force.
//!
//! A reusable `enforce` primitive plus the preset tiers. Handlers/extractors
//! call the preset that fits the endpoint; exceeding a limit yields `429` with a
//! `Retry-After` header (via `AppError::RateLimited`).

use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::services::redis_atomic::incr_with_ttl;

/// Increment the counter at `key` within a `window_secs` fixed window and reject
/// once it exceeds `limit`. The window starts on the first hit. The INCR + EXPIRE
/// run as a single atomic Lua script so a Redis hiccup can never leave the key
/// without a TTL (which would permanently lock the caller out).
pub async fn enforce(redis: &ConnectionManager, key: &str, limit: u64, window_secs: u64) -> AppResult<()> {
    let count = incr_with_ttl(redis, key, window_secs).await? as u64;
    if count > limit {
        let mut conn = redis.clone();
        let ttl: i64 = conn.ttl(key).await?;
        return Err(AppError::RateLimited { retry_after_secs: ttl.max(1) as u64 });
    }
    Ok(())
}

/// Public endpoints (unauthenticated search): 100 req/min per IP (FR-087).
pub async fn limit_public_ip(redis: &ConnectionManager, ip: &str) -> AppResult<()> {
    enforce(redis, &format!("rl:public:{ip}"), 100, 60).await
}

/// Authenticated endpoints (CRUD): 60 req/min per user (FR-087).
pub async fn limit_user(redis: &ConnectionManager, user_id: Uuid) -> AppResult<()> {
    enforce(redis, &format!("rl:user:{user_id}"), 60, 60).await
}

/// Payment endpoints: 10 req/hour per user (FR-087).
pub async fn limit_payment(redis: &ConnectionManager, user_id: Uuid) -> AppResult<()> {
    enforce(redis, &format!("rl:pay:{user_id}"), 10, 3600).await
}

/// Login attempts: 5 req/min per identifier (IP or phone) — brute-force guard.
pub async fn limit_login(redis: &ConnectionManager, identifier: &str) -> AppResult<()> {
    enforce(redis, &format!("rl:login:{identifier}"), 5, 60).await
}
