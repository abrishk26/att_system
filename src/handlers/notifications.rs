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
    types::{AppState, ClaimsExtractor, ErrorResponse, InstructorClaims},
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

#[derive(serde::Deserialize)]
pub struct SendAnnouncementRequest {
    pub session_id: uuid::Uuid,
    pub title: String,
    pub message: String,
}

pub async fn send_announcement_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
    Json(payload): Json<SendAnnouncementRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use diesel::ExpressionMethods;
    use crate::schema::{sessions, attendance_record};

    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let instructor_uuid = uuid::Uuid::parse_str(&user_id).map_err(|_| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "invalid user id".into() }))
    })?;

    // Verify the session belongs to this instructor
    let session = sessions::table
        .filter(crate::schema::sessions::id.eq(payload.session_id))
        .filter(crate::schema::sessions::instructor_id.eq(instructor_uuid))
        .get_result::<crate::models::Session>(&mut conn)
        .await
        .map_err(|_| (
            StatusCode::FORBIDDEN,
            Json(ErrorResponse { message: "session not found or not owned by you".into() }),
        ))?;

    // Get all students in this session from attendance_record
    let records = attendance_record::table
        .filter(attendance_record::session_id.eq(session.id))
        .load::<crate::models::AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    let count = records.len();
    for rec in &records {
        let notif = crate::models::NewNotification {
            user_id: rec.student_id,
            title: payload.title.clone(),
            message: payload.message.clone(),
            notification_type: "announcement".into(),
            action_url: None,
        };
        let _ = diesel::insert_into(crate::schema::notifications::table)
            .values(&notif)
            .execute(&mut conn)
            .await;
    }

    Ok((StatusCode::OK, Json(serde_json::json!({
        "message": "Announcement sent",
        "sent": count
    }))))
}
