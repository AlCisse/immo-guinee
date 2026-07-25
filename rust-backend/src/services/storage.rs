//! S3-compatible object storage (MinIO in dev, DO Spaces in prod) via `rust-s3`.
//!
//! Non-secret settings (endpoint/region/bucket) come from `Config`; credentials
//! come from `IMMOG_S3_ACCESS_KEY` / `IMMOG_S3_SECRET_KEY` (env in dev, Vault in
//! prod). Used for listing photos and documents.

use s3::creds::Credentials;
use s3::{Bucket, Region};

use crate::config::Config;
use crate::error::{AppError, AppResult};

pub struct S3Storage {
    bucket: Box<Bucket>,
    /// `{endpoint}/{bucket}` — base for building public object URLs.
    public_base: String,
}

/// Credentials for S3. In prod the keys come from Vault (passed in as
/// `s3_access` / `s3_secret`); in dev they come from `IMMOG_S3_ACCESS_KEY` /
/// `IMMOG_S3_SECRET_KEY`, defaulting to the MinIO dev defaults. Vault overrides
/// take precedence; a non-empty override wins over env.
fn credentials(s3_access: Option<String>, s3_secret: Option<String>) -> AppResult<Credentials> {
    let access = s3_access
        .filter(|k| !k.is_empty())
        .unwrap_or_else(|| std::env::var("IMMOG_S3_ACCESS_KEY").unwrap_or_else(|_| "minioadmin".into()));
    let secret = s3_secret
        .filter(|k| !k.is_empty())
        .unwrap_or_else(|| std::env::var("IMMOG_S3_SECRET_KEY").unwrap_or_else(|_| "minioadmin".into()));
    Credentials::new(Some(&access), Some(&secret), None, None, None)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("s3 credentials: {e}")))
}

/// Create the configured bucket if it does not exist (dev/test setup). Best-effort:
/// an "already owned by you" response is ignored. Uses env/local credentials
/// (dev bootstrap — Vault overrides are applied at `AppState` init time).
pub async fn ensure_bucket(cfg: &Config) -> AppResult<()> {
    let region = Region::Custom {
        region: cfg.s3_region.clone(),
        endpoint: cfg.s3_endpoint.clone(),
    };
    let _ = Bucket::create_with_path_style(
        &cfg.s3_bucket,
        region,
        credentials(None, None)?,
        s3::BucketConfiguration::default(),
    )
    .await;
    Ok(())
}

impl S3Storage {
    /// Build the storage client. `s3_access` / `s3_secret` are the Vault-fetched
    /// keys in prod (`None` in dev → env / MinIO defaults).
    pub fn from_config(cfg: &Config, s3_access: Option<String>, s3_secret: Option<String>) -> AppResult<Self> {
        let creds = credentials(s3_access, s3_secret)?;
        let region = Region::Custom {
            region: cfg.s3_region.clone(),
            endpoint: cfg.s3_endpoint.clone(),
        };
        // Path-style addressing is required for MinIO (and works with DO Spaces).
        let bucket = Bucket::new(&cfg.s3_bucket, region, creds)
            .map_err(|e| AppError::Internal(anyhow::anyhow!("s3 bucket: {e}")))?
            .with_path_style();

        // Browser-facing base: s3_public_url when set (dev: "/media" via the frontend
        // proxy; prod: the CDN), else the API endpoint.
        let public_endpoint = if cfg.s3_public_url.is_empty() {
            cfg.s3_endpoint.as_str()
        } else {
            cfg.s3_public_url.as_str()
        };
        let public_base = format!("{}/{}", public_endpoint.trim_end_matches('/'), cfg.s3_bucket);
        Ok(Self { bucket, public_base })
    }

    /// Upload `bytes` at `key` and return the object's public URL.
    pub async fn put(&self, key: &str, bytes: &[u8], content_type: &str) -> AppResult<String> {
        self.bucket
            .put_object_with_content_type(key, bytes, content_type)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("s3 put {key}: {e}")))?;
        Ok(object_url(&self.public_base, key))
    }

    /// Fetch the raw bytes of the object at `key` (e.g. to stream a private PDF
    /// through an authenticated endpoint rather than exposing the object URL).
    pub async fn get(&self, key: &str) -> AppResult<Vec<u8>> {
        let resp = self
            .bucket
            .get_object(key)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("s3 get {key}: {e}")))?;
        Ok(resp.bytes().to_vec())
    }

    /// Delete the object at `key`.
    pub async fn delete(&self, key: &str) -> AppResult<()> {
        self.bucket
            .delete_object(key)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!("s3 delete {key}: {e}")))?;
        Ok(())
    }

    pub fn url(&self, key: &str) -> String {
        object_url(&self.public_base, key)
    }
}

/// Join a public base and an object key into a URL (no double slash).
fn object_url(base: &str, key: &str) -> String {
    format!("{}/{}", base.trim_end_matches('/'), key.trim_start_matches('/'))
}

#[cfg(test)]
mod tests {
    use super::object_url;

    #[test]
    fn object_url_avoids_double_slash() {
        assert_eq!(
            object_url("http://localhost:9000/immoguinee-images", "/listings/a.webp"),
            "http://localhost:9000/immoguinee-images/listings/a.webp"
        );
        assert_eq!(
            object_url("http://localhost:9000/immoguinee-images/", "listings/a.webp"),
            "http://localhost:9000/immoguinee-images/listings/a.webp"
        );
    }
}
