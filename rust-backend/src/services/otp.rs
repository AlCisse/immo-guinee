//! OTP service — generation, Redis-backed storage and anti-fraud (FR-001, FR-029).
//!
//! Delivery (SMS) is delegated to the SMS service: `request` returns the freshly
//! generated code so the caller can send it. This keeps storage/anti-fraud
//! separate from the Twilio transport.
//!
//! Anti-fraud (FR-029): code valid 5 min, max 3 attempts then a 5 min block,
//! resend throttled to once per 60 s.

use rand::Rng;
use redis::AsyncCommands;
use redis::aio::ConnectionManager;

use crate::error::{AppError, AppResult};

const OTP_TTL_SECS: u64 = 300; // code valid 5 min (FR-001)
const RESEND_THROTTLE_SECS: u64 = 60; // one resend per minute (FR-029)
const MAX_ATTEMPTS: i64 = 3; // block after 3 wrong tries (FR-029)
const BLOCK_SECS: u64 = 300; // 5 min block (FR-029)

fn code_key(phone: &str) -> String {
    format!("otp:code:{phone}")
}
fn attempts_key(phone: &str) -> String {
    format!("otp:attempts:{phone}")
}
fn blocked_key(phone: &str) -> String {
    format!("otp:blocked:{phone}")
}
fn resend_key(phone: &str) -> String {
    format!("otp:resend:{phone}")
}

fn generate_code() -> String {
    let n: u32 = rand::thread_rng().gen_range(0..1_000_000);
    format!("{n:06}")
}

/// Comparaison en temps constant (S10). Une comparaison `==` court-circuite au
/// premier octet différent : le temps de réponse divulgue alors combien de
/// caractères du code soumis sont corrects (oracle de timing). On accumule les
/// différences d'octets sans sortie anticipée. La longueur (fixe, 6 chiffres)
/// est comparée une fois pour toutes ; le parcours du contenu est constant.
fn ct_eq(a: &str, b: &str) -> bool {
    let (a, b) = (a.as_bytes(), b.as_bytes());
    if a.len() != b.len() {
        return false;
    }
    let mut diff: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Generate a new OTP for `phone`, store it (5 min TTL) and reset the attempt
/// counter. Returns the code for the caller to deliver by SMS.
/// Rejects with `429` if a code was requested less than 60 s ago.
pub async fn request(redis: &ConnectionManager, phone: &str) -> AppResult<String> {
    let mut conn = redis.clone();

    let throttled: bool = conn.exists(resend_key(phone)).await?;
    if throttled {
        return Err(AppError::RateLimited { retry_after_secs: RESEND_THROTTLE_SECS });
    }

    let code = generate_code();
    let _: () = conn.set_ex(code_key(phone), &code, OTP_TTL_SECS).await?;
    let _: () = conn.del(attempts_key(phone)).await?;
    let _: () = conn.set_ex(resend_key(phone), 1, RESEND_THROTTLE_SECS).await?;
    Ok(code)
}

/// Clear the code, attempts and resend-throttle keys for `phone`. Used by the
/// notifier when delivery fails *after* `request` succeeded: without this the
/// 60 s resend throttle would leave the caller blocked with no code received.
pub async fn clear_request(redis: &ConnectionManager, phone: &str) -> AppResult<()> {
    let mut conn = redis.clone();
    let _: () = conn
        .del(&[code_key(phone), attempts_key(phone), resend_key(phone)])
        .await?;
    Ok(())
}

/// Verify `code` for `phone`. On success the code is consumed. On failure the
/// attempt counter increases; after 3 failures the phone is blocked for 5 min.
pub async fn verify(redis: &ConnectionManager, phone: &str, code: &str) -> AppResult<()> {
    let mut conn = redis.clone();

    let blocked: bool = conn.exists(blocked_key(phone)).await?;
    if blocked {
        return Err(AppError::RateLimited { retry_after_secs: BLOCK_SECS });
    }

    let stored: Option<String> = conn.get(code_key(phone)).await?;
    // S10 — comparaison en temps constant : évite l'oracle de timing sur le code.
    if stored.as_deref().is_some_and(|s| ct_eq(s, code)) {
        let _: () = conn.del(code_key(phone)).await?;
        let _: () = conn.del(attempts_key(phone)).await?;
        return Ok(());
    }

    // INCR + EXPIRE atomically (Lua): a separate EXPIRE could fail and leave the
    // attempts key without a TTL, locking the caller out of OTP for good.
    let attempts: i64 = crate::services::redis_atomic::incr_with_ttl(&conn, &attempts_key(phone), OTP_TTL_SECS).await?;
    if attempts >= MAX_ATTEMPTS {
        let _: () = conn.set_ex(blocked_key(phone), 1, BLOCK_SECS).await?;
        let _: () = conn.del(code_key(phone)).await?;
    }
    Err(AppError::Validation("Code OTP incorrect".into()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_code_is_six_digits() {
        for _ in 0..1000 {
            let c = generate_code();
            assert_eq!(c.len(), 6);
            assert!(c.chars().all(|ch| ch.is_ascii_digit()));
        }
    }
}
