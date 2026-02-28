use diesel_async::pooled_connection::bb8;
use serde::{Deserialize, Serialize};
use axum::{extract::FromRequestParts, Json, http::{request::Parts, StatusCode}} ;
use jwt_simple::prelude::*;

pub type Pool = bb8::Pool<diesel_async::AsyncPgConnection>;

#[derive(rust_embed::Embed)]
#[folder = "ui/dist"]
pub struct Assets;

#[derive(Serialize, Deserialize)]
pub struct LoginData {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Serialize)]
pub struct Tokens {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub message: String,
}

#[derive(Deserialize)]
pub struct UserData {
    pub user_id: String,
}

#[derive(Clone)]
pub struct AppState {
    pub client: reqwest::Client,
    pub pool: Pool,
}

pub struct ClaimsExtractor(pub String);

impl<S> FromRequestParts<S> for ClaimsExtractor
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "missing authorization header".to_string(),
                }),
            ))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "invalid authorization header format".to_string(),
                }),
            ));
        }

        let token = &auth_header[7..];
        let key = HS256Key::from_bytes(
            "raw_llkey_hastobeverylongtobestrongbuttheymakeitatruntime".as_bytes(),
        );

        let claims = key
            .verify_token::<NoCustomClaims>(token, None)
            .map_err(|e| {
                log::error!("Token verification failed: {}", e);
                (
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse {
                        message: "invalid or expired token".to_string(),
                    }),
                )
            })?;

        let user_id = claims.subject.ok_or((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                message: "invalid token subject".to_string(),
            }),
        ))?;

        Ok(ClaimsExtractor(user_id))
    }
}
