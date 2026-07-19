//! Router (replaces routes/api.php). Built per migration phase — domains are
//! added incrementally. Phase 0 exposes only /api/health (orchestration probe).
//!
//! All routes are stateful on `Arc<AppState>`. Layers (cors/limit/timeout/trace/
//! security headers) are state-agnostic and wrap the whole service.

use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use crate::config::Config;
use crate::middleware::security_headers::security_header_layers;
use crate::state::AppState;

mod health;

pub fn router(state: Arc<AppState>, cfg: &Config) -> Router {
    // Stateful API router; domains are merged in per phase.
    let api: Router<Arc<AppState>> = Router::new()
        .merge(health::routes())
        .merge(crate::domain::listings::routes()) // Phase 1 (read-only)
        .merge(crate::domain::auth::routes());     // T078-T083 (auth)
    // Phase 2: .merge(crate::domain::messaging::routes())
    // Phase 3: .merge(crate::domain::contracts::routes())
    // Phase 4: .merge(crate::domain::payments::routes())

    let cors = build_cors(cfg);

    // Everything is mounted under /api (matches the spec + frontend). Then provide
    // the state and apply state-agnostic layers. DefaultBodyLimit is the global
    // default; specific routes (e.g. photo upload) raise it via a route layer.
    let app = Router::new()
        .nest("/api", api)
        .with_state(state)
        .layer(DefaultBodyLimit::max(cfg.body_limit_bytes))
        .layer(TimeoutLayer::new(Duration::from_secs(cfg.request_timeout_secs)))
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // Security headers last (outermost), so they apply to every response.
    let mut app = app;
    for layer in security_header_layers() {
        app = app.layer(layer);
    }
    app
}

fn build_cors(cfg: &Config) -> CorsLayer {
    use axum::http::HeaderName;
    let origin: AllowOrigin = if cfg.cors_allowed_origin == "*" {
        AllowOrigin::any()
    } else {
        AllowOrigin::exact(
            cfg.cors_allowed_origin
                .parse()
                .unwrap_or_else(|_| "https://immoguinee.com".parse().expect("static origin parses")),
        )
    };
    CorsLayer::new()
        .allow_origin(origin)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("accept-language"),
            HeaderName::from_static("x-requested-with"),
        ])
}