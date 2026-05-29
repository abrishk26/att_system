use crate::models::{AttendanceRecord, Session, TapLog};
use crate::schema::{attendance_record, sessions, tap_log};
use crate::types::AppState;
use axum::http::StatusCode;
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use uuid::Uuid;

use crate::helpers::internal_error;
use crate::types::ErrorResponse;
use axum::Json;

pub struct RawSnapshot {
    pub sessions: Vec<Session>,
    pub records: Vec<AttendanceRecord>,
    pub taps: Vec<TapLog>,
}

pub async fn load_snapshot(
    state: &AppState,
) -> Result<RawSnapshot, (StatusCode, Json<ErrorResponse>)> {
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let sessions: Vec<Session> = sessions::table
        .load(&mut conn)
        .await
        .map_err(internal_error)?;
    let ids: Vec<Uuid> = sessions.iter().map(|s| s.id).collect();
    let records = if ids.is_empty() {
        Vec::new()
    } else {
        attendance_record::table
            .filter(attendance_record::session_id.eq_any(&ids))
            .load(&mut conn)
            .await
            .map_err(internal_error)?
    };
    let taps = if ids.is_empty() {
        Vec::new()
    } else {
        tap_log::table
            .filter(tap_log::session_id.eq_any(&ids))
            .load(&mut conn)
            .await
            .map_err(internal_error)?
    };
    Ok(RawSnapshot {
        sessions,
        records,
        taps,
    })
}
