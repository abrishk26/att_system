use diesel_async::pooled_connection::bb8;
use serde::{Deserialize, Serialize};
use axum::{extract::FromRequestParts, Json, http::{request::Parts, StatusCode}};
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
    pub role: String,
}

#[derive(Serialize)]
pub struct UserVerifyResponse {
    pub id: String,
    pub role: String,
}

#[derive(Serialize, Deserialize)]
pub struct ErrorResponse {
    pub message: String,
}

#[derive(Deserialize)]
pub struct UserData {
    pub user_id: String,
    pub role: String,
}

#[derive(Serialize, Deserialize)]
pub struct CustomClaims {
    pub role: String,
}

#[derive(Clone)]
pub struct AppState {
    pub client: reqwest::Client,
    pub pool: Pool,
    /// JWT HMAC key bytes — loaded from JWT_SECRET env var at startup
    pub jwt_secret: Vec<u8>,
    /// Base URL of the data_source service — loaded from DATA_SOURCE_URL env var
    pub data_source_url: String,
}

impl AppState {
    pub fn jwt_key(&self) -> HS256Key {
        HS256Key::from_bytes(&self.jwt_secret)
    }
}

pub struct ClaimsExtractor {
    pub user_id: String,
    pub role: String,
}

impl FromRequestParts<AppState> for ClaimsExtractor {
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
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
        let key = state.jwt_key();

        let claims = key
            .verify_token::<CustomClaims>(token, None)
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

        let role = claims.custom.role.clone();
        log::info!("Extracted token claims: user_id={}, role={}", user_id, role);

        Ok(ClaimsExtractor { user_id, role })
    }
}

pub struct InstructorClaims {
    pub user_id: String,
}

impl FromRequestParts<AppState> for InstructorClaims {
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let claims = ClaimsExtractor::from_request_parts(parts, state).await?;

        let role_lower = claims.role.to_lowercase();
        log::info!("Checking instructor access: user_id={}, role={}", claims.user_id, role_lower);
        if role_lower != "instructor" && role_lower != "admin" {
            log::warn!("Instructor access denied: user_id={}, role={}", claims.user_id, claims.role);
            return Err((
                StatusCode::FORBIDDEN,
                Json(ErrorResponse {
                    message: "access denied: instructor role required".to_string(),
                }),
            ));
        }

        Ok(InstructorClaims { user_id: claims.user_id })
    }
}

pub struct StudentClaims {
    pub user_id: String,
}

impl FromRequestParts<AppState> for StudentClaims {
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let claims = ClaimsExtractor::from_request_parts(parts, state).await?;

        let role_lower = claims.role.to_lowercase();
        log::info!("Checking student access: user_id={}, role={}", claims.user_id, role_lower);
        if role_lower != "student" && role_lower != "admin" {
            log::warn!("Student access denied: user_id={}, role={}", claims.user_id, claims.role);
            return Err((
                StatusCode::FORBIDDEN,
                Json(ErrorResponse {
                    message: "access denied: student role required".to_string(),
                }),
            ));
        }

        Ok(StudentClaims { user_id: claims.user_id })
    }
}

pub struct AdminClaims {
    pub user_id: String,
}

impl FromRequestParts<AppState> for AdminClaims {
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let claims = ClaimsExtractor::from_request_parts(parts, state).await?;

        let role_lower = claims.role.to_lowercase();
        if role_lower != "admin" {
            log::warn!("Admin access denied: user_id={}, role={}", claims.user_id, claims.role);
            return Err((
                StatusCode::FORBIDDEN,
                Json(ErrorResponse {
                    message: "access denied: admin role required".to_string(),
                }),
            ));
        }

        Ok(AdminClaims { user_id: claims.user_id })
    }
}
