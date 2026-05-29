mod analytics;
mod handlers;
mod helpers;
mod models;
mod router;
mod schema;
mod types;

use diesel_async::pooled_connection::{AsyncDieselConnectionManager, bb8};
use dotenvy::dotenv_override;
use env_logger::Env;
use reqwest::ClientBuilder;
use types::*;

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();
    dotenv_override().ok();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    log::info!("Database Url: {}", db_url);

    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set in .env")
        .into_bytes();

    let data_source_url = std::env::var("DATA_SOURCE_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3000".to_string());
    log::info!("Data source URL: {}", data_source_url);

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
    println!("Listening on {}", addr);
    axum::serve(listener, router::new(app_state)).await.unwrap();
}
