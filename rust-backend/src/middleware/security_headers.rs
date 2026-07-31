//! Security headers (replaces Laravel app/Http/Middleware/SecurityHeaders.php).
//!
//! Built from tower-http `SetResponseHeaderLayer` (stateless, Send-safe) rather
//! than a custom Service — the headers are static; HSTS is added only in prod.
//! CSP is kept permissive for now (Axum/SPA); tighten per phase.

use axum::http::{HeaderName, HeaderValue};
use tower_http::set_header::SetResponseHeaderLayer;

/// Returns the security-header layers (apply each with `.layer(...)`).
pub fn security_header_layers() -> Vec<SetResponseHeaderLayer<HeaderValue>> {
    let mk = |name: &'static str, val: &'static str| {
        SetResponseHeaderLayer::overriding(
            HeaderName::from_static(name),
            HeaderValue::from_static(val),
        )
    };

    let mut layers = vec![
        mk("x-frame-options", "DENY"),
        mk("x-content-type-options", "nosniff"),
        mk("referrer-policy", "strict-origin-when-cross-origin"),
        mk("permissions-policy", "geolocation=(), microphone=(), camera=()"),
    ];

    // HSTS only in production (sent over HTTPS; ignored on HTTP anyway).
    if std::env::var("IMMOG_APP_ENV").as_deref() == Ok("production") {
        layers.push(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("strict-transport-security"),
            HeaderValue::from_static("max-age=63072000; includeSubDomains; preload"),
        ));
    }

    layers
}