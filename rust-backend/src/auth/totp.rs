//! TOTP 2FA (RFC 6238) — for admins and payments > 500 000 GNF (FR-045).
//!
//! Pure functions over a base32 secret: the secret's persistence (a
//! `two_factor_secret` column on `users`) is added with the enrollment endpoints.

use totp_rs::{Algorithm, Secret, TOTP};

use crate::error::{AppError, AppResult};

const ISSUER: &str = "ImmoGuinée";

/// Generate a new base32-encoded TOTP secret (to store per user at enrollment).
pub fn generate_secret() -> String {
    Secret::generate_secret().to_encoded().to_string()
}

fn build(secret_b32: &str, account: &str) -> AppResult<TOTP> {
    let secret = Secret::Encoded(secret_b32.to_owned())
        .to_bytes()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("secret TOTP invalide: {e:?}")))?;
    TOTP::new(Algorithm::SHA1, 6, 1, 30, secret, Some(ISSUER.to_owned()), account.to_owned())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("init TOTP: {e:?}")))
}

/// `otpauth://` provisioning URI (encode as a QR code for Google Authenticator).
pub fn provisioning_uri(secret_b32: &str, account: &str) -> AppResult<String> {
    Ok(build(secret_b32, account)?.get_url())
}

/// Verify a 6-digit code against the secret (±1 time step of tolerance).
pub fn verify(secret_b32: &str, account: &str, code: &str) -> AppResult<bool> {
    let totp = build(secret_b32, account)?;
    totp.check_current(code)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("vérification TOTP: {e:?}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_and_verify_roundtrip() {
        let account = "admin@immoguinee.com";
        let secret = generate_secret();
        let totp = build(&secret, account).unwrap();
        let code = totp.generate_current().unwrap();

        assert!(verify(&secret, account, &code).unwrap());

        let wrong = if code == "000000" { "000001" } else { "000000" };
        assert!(!verify(&secret, account, wrong).unwrap());
    }

    #[test]
    fn provisioning_uri_is_otpauth() {
        let uri = provisioning_uri(&generate_secret(), "admin@immoguinee.com").unwrap();
        assert!(uri.starts_with("otpauth://totp/"));
    }
}
