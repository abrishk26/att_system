use diesel::{ConnectionError, ConnectionResult};
use diesel_async::pooled_connection::bb8::Pool;
use diesel_async::pooled_connection::{AsyncDieselConnectionManager, ManagerConfig};
use diesel_async::AsyncPgConnection;
use futures_util::future::BoxFuture;
use futures_util::FutureExt;
use tracing::info;

pub type DbPool = Pool<AsyncPgConnection>;

// Uses postgres-native-tls (not tokio-postgres-rustls) to avoid a digest/crypto
// crate conflict with jwt-simple in this crate's dependency graph.

/// Build a connection pool with TLS (required for hosted Postgres e.g. Neon).
pub async fn create_pool(database_url: String) -> Result<DbPool, Box<dyn std::error::Error + Send + Sync>> {
    let mut manager_config = ManagerConfig::default();
    manager_config.custom_setup = Box::new(establish_tls_connection);

    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new_with_config(
        database_url,
        manager_config,
    );

    let pool = Pool::builder().build(manager).await?;
    info!("Database connection pool ready");
    Ok(pool)
}

fn establish_tls_connection(config: &str) -> BoxFuture<'_, ConnectionResult<AsyncPgConnection>> {
    async move {
        let connector = native_tls::TlsConnector::builder()
            .build()
            .map_err(|e| ConnectionError::BadConnection(format!("TLS connector error: {e}")))?;
        let tls = postgres_native_tls::MakeTlsConnector::new(connector);

        let (client, connection) = tokio_postgres::connect(config, tls)
            .await
            .map_err(|e| ConnectionError::BadConnection(e.to_string()))?;

        AsyncPgConnection::try_from_client_and_connection(client, connection).await
    }
    .boxed()
}
