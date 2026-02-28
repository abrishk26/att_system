use crate::types::*;
use axum::{
    extract::{State}, http::{StatusCode, Method}, Json
};
use jwt_simple::prelude::*;

pub mod instructors;
pub mod students;

pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginData>,
) -> Result<(StatusCode, Json<Tokens>), (StatusCode, Json<ErrorResponse>)> {
    println!("Before request");
    let response = state
        .client
        .request(Method::POST, "http://127.0.0.1:3000/login")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            log::error!("Error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "internal server error".to_string(),
                }),
            )
        })?;

    println!("Got response");

    return match response.status() {
        StatusCode::OK => {
            let json = response.json::<UserData>().await.map_err(|e| {
                log::error!("Error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "internal server error".to_string(),
                    }),
                )
            })?;
            let key = HS256Key::from_bytes(
                "raw_llkey_hastobeverylongtobestrongbuttheymakeitatruntime".as_bytes(),
            );
            let claims = Claims::create(Duration::from_mins(5)).with_subject(json.user_id.clone());
            let access_token = key.authenticate(claims).map_err(|e| {
                log::error!("Error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "internal server error".to_string(),
                    }),
                )
            })?;

            let claims = Claims::create(Duration::from_days(30)).with_subject(json.user_id);
            let refresh_token = key.authenticate(claims).map_err(|e| {
                log::error!("Error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "internal server error".to_string(),
                    }),
                )
            })?;

            println!("Got json");

            Ok((
                StatusCode::OK,
                Json(Tokens {
                    access_token,
                    refresh_token,
                }),
            ))
        }
        StatusCode::BAD_REQUEST => Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                message: "invalid username or password".to_string(),
            }),
        )),
        _ => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                message: "internal server error".to_string(),
            }),
        )),
    };
}

pub async fn refresh_handler(
    Json(payload): Json<RefreshRequest>,
) -> Result<(StatusCode, Json<Tokens>), (StatusCode, Json<ErrorResponse>)> {
    let key = HS256Key::from_bytes(
        "raw_llkey_hastobeverylongtobestrongbuttheymakeitatruntime".as_bytes(),
    );

    let claims = key
        .verify_token::<NoCustomClaims>(&payload.refresh_token, None)
        .map_err(|e| {
            log::error!("Error verifying token: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "invalid refresh token".to_string(),
                }),
            )
        })?;

    let user_id = claims.subject.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                message: "invalid token subject".to_string(),
            }),
        )
    })?;

    // Create new access token
    let claims = Claims::create(Duration::from_mins(5)).with_subject(user_id.clone());
    let access_token = key.authenticate(claims).map_err(|e| {
        log::error!("Error creating access token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                message: "internal server error".to_string(),
            }),
        )
    })?;

    // Create new refresh token
    let claims = Claims::create(Duration::from_days(30)).with_subject(user_id);
    let refresh_token = key.authenticate(claims).map_err(|e| {
        log::error!("Error creating refresh token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                message: "internal server error".to_string(),
            }),
        )
    })?;

    Ok((
        StatusCode::OK,
        Json(Tokens {
            access_token,
            refresh_token,
        }),
    ))
}


pub async fn static_handler(uri: axum::http::Uri) -> impl axum::response::IntoResponse {
    use axum::response::IntoResponse;

    let path = uri.path().trim_start_matches('/');

    // Try to serve the exact file first
    if let Some(content) = Assets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return (
            [(axum::http::header::CONTENT_TYPE, mime.as_ref())],
            content.data.into_owned(),
        )
            .into_response();
    }

    // SPA fallback: serve index.html for all other routes
    match Assets::get("index.html") {
        Some(content) => (
            [(axum::http::header::CONTENT_TYPE, "text/html")],
            content.data.into_owned(),
        )
            .into_response(),
        None => axum::http::StatusCode::NOT_FOUND.into_response(),
    }
}
