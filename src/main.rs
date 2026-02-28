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

    let db_url = std::env::var("DATABASE_URL").unwrap();
    log::info!("Database Url: {}", db_url);
    // set up connection pool
    let config = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new(db_url);
    let pool = bb8::Pool::builder().build(config).await.unwrap();
    let client = ClientBuilder::new().build().unwrap();
    let app_state = AppState { client, pool };

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("unable to bind listening address");

    println!("Listening on port 3001");
    axum::serve(listener, router::new(app_state)).await.unwrap();
}
