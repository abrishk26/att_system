use crate::types::*;
use axum::{
    extract::State,
    http::{StatusCode, Method},
    Json,
};
use jwt_simple::prelude::*;
use crate::models::{LogoutRequest, NfcLoginRequest, TokenDenylist, StudentProfile};
use crate::schema::token_denylist;

pub mod analytics;
pub mod instructors;
pub mod students;
pub mod notifications;



pub async fn login_handler(
    State(state): State<AppState>,
    Json(payload): Json<LoginData>,
) -> Result<(StatusCode, Json<Tokens>), (StatusCode, Json<ErrorResponse>)> {
    let login_url = format!("{}/login", state.data_source_url);
    let response = state
        .client
        .request(Method::POST, &login_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            log::error!("Error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { message: "internal server error".to_string() }),
            )
        })?;

    if response.status().is_success() {
        let json = response.json::<UserData>().await.map_err(|e| {
            log::error!("Login response parse error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { message: "internal server error".to_string() }),
            )
        })?;
        log::info!("Data source login success: user_id={}, role={}", json.user_id, json.role);
        let (access_token, refresh_token) = issue_tokens(&state.jwt_key(), &json.user_id, &json.role)?;
        log::info!("Tokens issued for user_id={}, role={}", json.user_id, json.role);
        Ok((StatusCode::OK, Json(Tokens { access_token, refresh_token, role: json.role })))
    } else if response.status() == StatusCode::BAD_REQUEST {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse { message: "invalid username or password".to_string() }),
        ))
    } else {
        Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { message: "internal server error".to_string() }),
        ))
    }
}

pub async fn refresh_handler(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<(StatusCode, Json<Tokens>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use diesel::{ExpressionMethods, QueryDsl};
    use crate::helpers::internal_error;

    let key = state.jwt_key();

    let claims = key
        .verify_token::<CustomClaims>(&payload.refresh_token, None)
        .map_err(|e| {
            log::error!("Error verifying token: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse { message: "invalid refresh token".to_string() }),
            )
        })?;

    // Check token denylist
    let jti = claims.jwt_id.clone().unwrap_or_default();
    if !jti.is_empty() {
        let mut conn = state.pool.get().await.map_err(internal_error)?;
        let denied: bool = token_denylist::table
            .filter(token_denylist::jti.eq(&jti))
            .count()
            .get_result::<i64>(&mut conn)
            .await
            .map_err(internal_error)? > 0;

        if denied {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse { message: "token has been revoked".to_string() }),
            ));
        }
    }

    let role = claims.custom.role.clone();
    let user_id = claims.subject.ok_or_else(|| (
        StatusCode::UNAUTHORIZED,
        Json(ErrorResponse { message: "invalid token subject".to_string() }),
    ))?;

    let (access_token, refresh_token) = issue_tokens(&state.jwt_key(), &user_id, &role)?;
    Ok((StatusCode::OK, Json(Tokens { access_token, refresh_token, role })))
}

pub async fn verify_handler(
    ClaimsExtractor { user_id, role }: ClaimsExtractor,
) -> Result<(StatusCode, Json<UserVerifyResponse>), (StatusCode, Json<ErrorResponse>)> {
    Ok((StatusCode::OK, Json(UserVerifyResponse { id: user_id, role })))
}

/// POST /logout — revokes the refresh token server-side (B-03)
pub async fn logout_handler(
    State(state): State<AppState>,
    _: ClaimsExtractor,
    Json(payload): Json<LogoutRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use crate::helpers::internal_error;
    use chrono::Utc;

    let key = state.jwt_key();

    let claims = key
        .verify_token::<CustomClaims>(&payload.refresh_token, None)
        .map_err(|_| (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse { message: "invalid refresh token".to_string() }),
        ))?;

    let jti = claims.jwt_id.unwrap_or_else(|| uuid::Uuid::now_v7().to_string());
    let expires_at = claims.expires_at
        .map(|d| Utc::now() + chrono::Duration::seconds(d.as_secs() as i64))
        .unwrap_or_else(|| Utc::now() + chrono::Duration::days(30));

    let entry = TokenDenylist {
        jti,
        revoked_at: Utc::now(),
        expires_at,
    };

    let mut conn = state.pool.get().await.map_err(internal_error)?;
    // INSERT OR IGNORE — idempotent
    diesel::insert_into(token_denylist::table)
        .values(&entry)
        .on_conflict(token_denylist::jti)
        .do_nothing()
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    log::info!("Token revoked: jti={}", entry.jti);
    Ok((StatusCode::OK, Json(serde_json::json!({ "message": "Logged out successfully" }))))
}

/// POST /auth/login/nfc — NFC card login (B-07)
pub async fn nfc_login_handler(
    State(state): State<AppState>,
    Json(payload): Json<NfcLoginRequest>,
) -> Result<(StatusCode, Json<Tokens>), (StatusCode, Json<ErrorResponse>)> {
    // Look up student by NFC ID from data_source
    let nfc_url = format!("{}/student/profile?nfc_id={}", state.data_source_url, payload.nfc_id);
    let response = state
        .client
        .request(
            Method::GET,
            &nfc_url,
        )
        .send()
        .await
        .map_err(|e| {
            log::error!("NFC login data_source error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { message: "internal server error".to_string() }),
            )
        })?;

    if response.status() == StatusCode::NOT_FOUND || !response.status().is_success() {
        log::warn!("NFC login failed: nfc_id={}", payload.nfc_id);
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                message: "NFC card not recognised or account inactive".to_string(),
            }),
        ));
    }

    let profile = response.json::<StudentProfile>().await.map_err(|e| {
        log::error!("NFC login parse error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { message: "internal server error".to_string() }),
        )
    })?;

    let user_id = profile.id.to_string();
    let role = profile.role;
    let (access_token, refresh_token) = issue_tokens(&state.jwt_key(), &user_id, &role)?;

    log::info!("NFC login success: nfc_id={}, user_id={}, role={}", payload.nfc_id, user_id, role);
    Ok((StatusCode::OK, Json(Tokens { access_token, refresh_token, role })))
}

// ── Internal helper ───────────────────────────────────────────────────────────

fn issue_tokens(
    key: &HS256Key,
    user_id: &str,
    role: &str,
) -> Result<(String, String), (StatusCode, Json<ErrorResponse>)> {
    let key = key;

    let access_claims = Claims::with_custom_claims(
        CustomClaims { role: role.to_string() },
        Duration::from_mins(5),
    )
    .with_subject(user_id)
    .with_jwt_id(uuid::Uuid::now_v7().to_string());

    let access_token = key.authenticate(access_claims).map_err(|e| {
        log::error!("Error creating access token: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { message: "internal server error".to_string() }))
    })?;

    let refresh_claims = Claims::with_custom_claims(
        CustomClaims { role: role.to_string() },
        Duration::from_days(30),
    )
    .with_subject(user_id)
    .with_jwt_id(uuid::Uuid::now_v7().to_string());

    let refresh_token = key.authenticate(refresh_claims).map_err(|e| {
        log::error!("Error creating refresh token: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { message: "internal server error".to_string() }))
    })?;

    Ok((access_token, refresh_token))
}

pub async fn static_handler(uri: axum::http::Uri) -> impl axum::response::IntoResponse {
    use axum::response::IntoResponse;

    let path = uri.path().trim_start_matches('/');

    if path.starts_with("uploads/") {
        if let Ok(data) = tokio::fs::read(path).await {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            return (
                [(axum::http::header::CONTENT_TYPE, mime.as_ref().to_string())],
                data,
            )
                .into_response();
        }
    }

    if let Some(content) = Assets::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        return (
            [(axum::http::header::CONTENT_TYPE, mime.as_ref().to_string())],
            content.data.into_owned(),
        )
            .into_response();
    }

    match Assets::get("index.html") {
        Some(content) => (
            [(axum::http::header::CONTENT_TYPE, "text/html".to_string())],
            content.data.into_owned(),
        )
            .into_response(),
        None => axum::http::StatusCode::NOT_FOUND.into_response(),
    }
}
