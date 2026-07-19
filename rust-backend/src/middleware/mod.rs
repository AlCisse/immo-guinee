//! Middleware stack (replaces Laravel app/Http/Middleware/*).
//!
//! Each Laravel middleware maps to a Tower layer or an Axum extractor:
//! - SecurityHeaders        -> middleware::security_headers::SecurityHeadersLayer
//! - SanitizeInput          -> (todo) tower layer trimming/escaping input
//! - ThrottleRequests        -> (todo) tower-governor (per-limiter profiles)
//! - SetLocale              -> extractors::locale (Accept-Language)
//! - TwoFactorAuthentication-> extractors::require_2fa (admin routes)
//! - CheckAdmin / EnsureUserHasRole -> extractors::auth + policy
//! - AuthenticateFromCookie -> (todo) tower-sessions + cookie extractor

pub mod security_headers;