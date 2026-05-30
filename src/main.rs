mod analytics;
mod handlers;
mod helpers;
mod models;
mod router;
mod schema;
mod types;

use diesel_async::pooled_connection::{AsyncDieselConnectionManager, bb8};
use dotenvy::dotenv_override;
use reqwest::ClientBuilder;
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt};
use types::*;

#[tokio::main]
async fn main() {
    // Initialise tracing — respects RUST_LOG env var, defaults to "info"
    // The fmt layer prints: timestamp, level, target, span fields, message
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(true)
        .with_thread_ids(false)
        .init();

    // Bridge legacy log:: macros used in handlers into tracing
    tracing_log::LogTracer::init().ok();

    dotenv_override().ok();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    info!(db_url = %db_url, "Database URL loaded");

    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set in .env")
        .into_bytes();

    let data_source_url = std::env::var("DATA_SOURCE_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    info!(data_source_url = %data_source_url, "Data source URL loaded");

    let server_port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "0".to_string());

    // Set up connection pool
    let config = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new(db_url);
    let pool = bb8::Pool::builder().build(config).await.unwrap();

    let client = ClientBuilder::new()
        .timeout(std::time::Duration::from_secs(10))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap();

    let app_state = AppState { client, pool, jwt_secret, data_source_url };

    let bind_addr = format!("0.0.0.0:{}", server_port);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .expect("unable to bind listening address");

    let addr = listener.local_addr().unwrap();
    info!(address = %addr, "Server listening");
    axum::serve(listener, router::new(app_state)).await.unwrap();
}
