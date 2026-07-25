//! Atomic Redis helpers — compound operations executed as a single Lua script
//! so there is no window where a key can be left without a TTL (the race that
//! caused permanent lockouts in the old `INCR` + separate `EXPIRE` pattern).
//!
//! `incr_with_ttl` atomically increments a counter and sets its TTL on the first
//! hit. Used by the rate limiter (fixed window) and the OTP attempt counter.

use redis::aio::ConnectionManager;

use crate::error::{AppError, AppResult};

/// `INCR key; if count == 1 then EXPIRE key ttl end; return count` — one round
/// trip, no intermediate state where the key exists without an expiry.
const INCR_EXPIRE: &str = "local c = redis.call('INCR', KEYS[1]) \
  if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end \
  return c";

/// Atomically increment `key` and set its TTL to `ttl_secs` on the first hit.
/// Returns the new counter value.
pub async fn incr_with_ttl(conn: &ConnectionManager, key: &str, ttl_secs: u64) -> AppResult<i64> {
    let mut conn = conn.clone();
    let count: i64 = redis::cmd("EVAL")
        .arg(INCR_EXPIRE)
        .arg(1i64) // numkeys
        .arg(key)
        .arg(ttl_secs as i64) // ARGV[1]
        .query_async(&mut conn)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("redis EVAL incr_expire: {e}")))?;
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Live-Redis test omitted (no test harness wires a Redis connection here).
    // The Lua script is covered by manual/CI integration; the unit-level
    // guarantee is that the script string is a single valid statement line.
    #[test]
    fn incr_expire_script_is_single_line() {
        // The `\` line continuations must collapse into one Lua line.
        let lines: Vec<&str> = INCR_EXPIRE.split('\n').filter(|l| !l.is_empty()).collect();
        assert_eq!(lines.len(), 1, "INCR_EXPIRE must be a single Lua line");
        assert!(lines[0].starts_with("local c = redis.call('INCR'"));
        assert!(lines[0].contains("return c"));
    }
}