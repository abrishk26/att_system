//! Frontend static file serving with SPA fallback (`try_files` → `index.html`).

use std::path::PathBuf;

use axum::Router;

/// Directory containing Vite `index.html` and `assets/` (override with `STATIC_DIR`).
pub fn static_dist_path() -> PathBuf {
    std::env::var("STATIC_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("ui/dist"))
}

/// Register catch-all frontend serving **after** `/api` routes.
///
/// - Disk (`ui/dist/index.html` exists): `ServeDir` + `not_found_service(index.html)` (200, no redirect).
/// - Embedded only (e.g. binary-only deploy): rust-embed handler with the same fallback rules.
pub fn with_frontend_fallback<S>(router: Router<S>) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    let dist = static_dist_path();
    let index = dist.join("index.html");

    if index.is_file() {
        use tower_http::services::{ServeDir, ServeFile};

        tracing::info!(
            dir = %dist.display(),
            "Serving UI from disk; unknown paths return index.html (SPA)"
        );

        let spa = ServeDir::new(&dist).not_found_service(ServeFile::new(index));

        return router
            .nest_service("/uploads", ServeDir::new("uploads"))
            .fallback_service(spa);
    }

    tracing::info!("ui/dist not on disk; serving embedded UI with SPA index fallback");

    router.fallback(crate::handlers::static_handler)
}
