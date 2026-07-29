//! Redis response cache for hot public read endpoints (listings search).
//!
//! The HTTP layer expresses stale-while-revalidate via the `Cache-Control`
//! header (browser/CDN caching); this layer short-circuits the expensive
//! `count()` + page fetch on the server, so a cache hit never touches Postgres.
//!
//! Keys are namespaced `cache:<endpoint>:<stable-key>`. Values are the
//! serialized JSON `data` payload. TTL is short (tens of seconds): listings stay
//! fresh, but bursts (a popular search, a homepage reload) are absorbed by Redis.
//!
//! Cache failures are *best-effort*: any Redis error falls through to the DB,
//! never breaks the request.

use redis::AsyncCommands;

/// Fetch cached bytes for `key`. `None` on miss or any Redis error (fall through).
pub async fn get_bytes(conn: &mut redis::aio::ConnectionManager, key: &str) -> Option<Vec<u8>> {
    conn.get::<_, Option<Vec<u8>>>(key).await.ok().flatten()
}

/// Store `bytes` at `key` with a TTL (seconds). Best-effort: logs on failure.
pub async fn set_bytes(conn: &mut redis::aio::ConnectionManager, key: &str, bytes: &[u8], ttl_secs: u64) {
    if let Err(e) = conn.set_ex::<_, _, ()>(key, bytes, ttl_secs).await {
        tracing::warn!(error = %e, %key, "cache write failed (non-fatal)");
    }
}

/// Current search-cache generation. Included in the cache key so that
/// [`bump_search_version`] orphanes every existing entry in O(1) (they expire on
/// their own TTL) — no SCAN/DEL needed. Defaults to 0 when Redis is empty.
pub async fn search_version(conn: &mut redis::aio::ConnectionManager) -> u64 {
    conn.get::<_, Option<u64>>("cache:search:version")
        .await
        .ok()
        .flatten()
        .unwrap_or(0)
}

/// Invalidate the whole search cache (call on any listing mutation:
/// create/update/destroy/reactivate/mark-as-rented/photo upload).
pub async fn bump_search_version(conn: &mut redis::aio::ConnectionManager) {
    let _: redis::RedisResult<u64> = conn.incr("cache:search:version", 1).await;
}