use uuid::Uuid;
use diesel::{BoolExpressionMethods, ExpressionMethods, QueryDsl};
use axum::{extract::{State, Path}, http::{StatusCode, Method}, Json};
use crate::types::*;
use crate::schema::attendance_record;
use crate::helpers::internal_error;
use crate::models::{
    AttendanceRecordWithStudent, AttendanceRecord, Course,
    UpdateRecordRequest, UserProfile,
};

pub async fn get_sessions_by_student(
    State(state): State<AppState>,
    ClaimsExtractor(user_id): ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<AttendanceRecord>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let records = attendance_record::table
        .filter(attendance_record::student_id.eq(Uuid::parse_str(&user_id).unwrap()))
        .load::<AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(records)))
}


pub async fn get_student_courses(
    State(state): State<AppState>,
    ClaimsExtractor(user_id): ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<Course>>), (StatusCode, Json<ErrorResponse>)> {
    let response = state
        .client
        .request(
            Method::GET,
            format!("http://127.0.0.1:3000/student/courses/{}", user_id),
        )
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        return Err((
            response.status(),
            Json(ErrorResponse {
                message: "failed to fetch student courses".to_string(),
            }),
        ));
    }

    let courses = response.json::<Vec<Course>>().await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(courses)))
}


pub async fn get_records_with_student_info(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    _: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<AttendanceRecordWithStudent>>), (StatusCode, Json<ErrorResponse>)>
{
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let records = attendance_record::table
        .filter(attendance_record::session_id.eq(session_id))
        .load::<AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    let mut enriched_records = Vec::new();

    for record in records {
        let response = state
            .client
            .request(
                Method::GET,
                format!(
                    "http://127.0.0.1:3000/student/profile?id={}",
                    record.student_id
                ),
            )
            .send()
            .await
            .map_err(internal_error)?;

        if response.status() == StatusCode::OK {
            let student_info = response.json::<UserProfile>().await.map_err(internal_error)?;
            enriched_records.push(AttendanceRecordWithStudent {
                id: record.id,
                student_id: record.student_id,
                session_id: record.session_id,
                status: record.status,
                student_name: format!(
                    "{} {}",
                    student_info.first_name,
                    student_info.last_name.unwrap_or_default()
                ),
                nfc_id: student_info.username, // Assuming username or nfc_id is available
            });
        }
    }

    Ok((StatusCode::OK, Json(enriched_records)))
}


pub async fn mark_attendance_handler(
    State(state): State<AppState>,
    _: ClaimsExtractor,
    Json(payload): Json<UpdateRecordRequest>,
) -> Result<(StatusCode, Json<AttendanceRecord>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let response = state
        .client
        .request(
            Method::GET,
            format!(
                "http://127.0.0.1:3000/student/profile?nfc_id={}",
                payload.nfc_id
            ),
        )
        .send()
        .await
        .map_err(internal_error)?;

    let student_info = match response.status() {
        StatusCode::OK => response.json::<UserProfile>().await.map_err(internal_error)?,
        _ => {
            return Err((
                response.status(),
                Json(ErrorResponse {
                    message: "failed to fetch student profile from data source".to_string(),
                }),
            ));
        }
    };

    let record = diesel::update(attendance_record::table)
        .filter(
            attendance_record::session_id
                .eq(payload.session_id)
                .and(attendance_record::student_id.eq(Uuid::parse_str(&student_info.id).unwrap())),
        )
        .set(attendance_record::status.eq(payload.status))
        .get_result::<AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(record)))
}