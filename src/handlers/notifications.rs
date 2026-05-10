use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use uuid::Uuid;

use crate::{
    models::Notification,
    schema::notifications,
    types::{AppState, ClaimsExtractor, ErrorResponse},
};

fn internal_error<E: std::fmt::Display>(err: E) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            message: format!("Internal server error: {}", err),
        }),
    )
}

pub async fn get_notifications_handler(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<Notification>>), (StatusCode, Json<ErrorResponse>)> {
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "Invalid user ID".into() }))
    })?;

    let notifs = notifications::table
        .filter(notifications::user_id.eq(user_uuid))
        .order(notifications::created_at.desc())
        .limit(50)
        .load::<Notification>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(notifs)))
}

pub async fn mark_notification_read_handler(
    State(state): State<AppState>,
    Path(notification_id): Path<Uuid>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "Invalid user ID".into() }))
    })?;

    diesel::update(notifications::table)
        .filter(notifications::id.eq(notification_id))
        .filter(notifications::user_id.eq(user_uuid))
        .set(notifications::is_read.eq(true))
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok(StatusCode::OK)
}

pub async fn mark_all_read_handler(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "Invalid user ID".into() }))
    })?;

    diesel::update(notifications::table)
        .filter(notifications::user_id.eq(user_uuid))
        .set(notifications::is_read.eq(true))
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok(StatusCode::OK)
}
