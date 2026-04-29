use uuid::Uuid;
use diesel::{BoolExpressionMethods, ExpressionMethods, QueryDsl};
use axum::{extract::{State, Path, Multipart}, http::{StatusCode, Method}, Json};
use crate::types::*;
use crate::schema::attendance_record;
use crate::helpers::internal_error;
use crate::models::{
    AttendanceRecordWithStudent, AttendanceRecord, Course, Session,
    UpdateRecordRequest, Permission, StudentProfile,
};

pub async fn get_sessions_by_student(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
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

pub async fn get_student_sessions(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
) -> Result<(StatusCode, Json<Vec<Session>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    use crate::schema::sessions;
    use crate::models::Session;

    let student_uuid = Uuid::parse_str(&user_id).map_err(internal_error)?;

    // Get all session IDs that this student has a record for
    let student_session_ids = attendance_record::table
        .filter(attendance_record::student_id.eq(student_uuid))
        .select(attendance_record::session_id)
        .load::<Uuid>(&mut conn)
        .await
        .map_err(internal_error)?;

    // Fetch the full sessions
    let full_sessions = sessions::table
        .filter(sessions::id.eq_any(student_session_ids))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(full_sessions)))
}


pub async fn get_student_courses(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
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
        let status = response.status();
        let err_msg = if let Ok(err_resp) = response.json::<ErrorResponse>().await {
            err_resp.message
        } else {
            "failed to fetch student courses".to_string()
        };
        return Err((
            status,
            Json(ErrorResponse {
                message: err_msg,
            }),
        ));
    }

    let courses = response.json::<Vec<Course>>().await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(courses)))
}


pub async fn get_records_with_student_info(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    InstructorClaims { .. }: InstructorClaims,
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
            let student_info = response.json::<StudentProfile>().await.map_err(internal_error)?;
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
    InstructorClaims { .. }: InstructorClaims,
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

    let status = response.status();
    let student_info = match status {
        StatusCode::OK => response.json::<StudentProfile>().await.map_err(internal_error)?,
        _ => {
            let err_msg = if let Ok(err_resp) = response.json::<ErrorResponse>().await {
                err_resp.message
            } else {
                "failed to fetch student profile from data source".to_string()
            };
            return Err((
                status,
                Json(ErrorResponse {
                    message: err_msg,
                }),
            ));
        }
    };

    let record = diesel::update(attendance_record::table)
        .filter(
            attendance_record::session_id
                .eq(payload.session_id)
                .and(attendance_record::student_id.eq(student_info.id)),
        )
        .set(attendance_record::status.eq(payload.status))
        .get_result::<AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(record)))
}

pub async fn get_student_permissions(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
) -> Result<(StatusCode, Json<Vec<Permission>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let permissions = crate::schema::permissions::table
        .filter(crate::schema::permissions::student_id.eq(Uuid::parse_str(&user_id).unwrap()))
        .load::<Permission>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(permissions)))
}

pub async fn create_permission_handler(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<Permission>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let mut session_id = None;
    let mut description = None;
    let mut img_url = None;

    while let Some(field) = multipart.next_field().await.map_err(internal_error)? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "session_id" {
            let data = field.text().await.map_err(internal_error)?;
            session_id = Some(Uuid::parse_str(&data).map_err(internal_error)?);
        } else if name == "description" {
            description = Some(field.text().await.map_err(internal_error)?);
        } else if name == "file" {
            let filename = field.file_name().unwrap_or("upload.tmp").to_string();
            let data = field.bytes().await.map_err(internal_error)?;
            
            let file_ext = std::path::Path::new(&filename)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("bin");
            
            let new_filename = format!("{}.{}", Uuid::now_v7(), file_ext);
            let target_path = format!("uploads/{}", new_filename);
            
            tokio::fs::write(&target_path, &data).await.map_err(internal_error)?;
            img_url = Some(target_path);
        }
    }

    let session_id_uuid = session_id.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "session_id is required".to_string() }))
    })?;
    let description_text = description.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "description is required".to_string() }))
    })?;

    let new_permission = Permission {
        id: Uuid::now_v7(),
        session_id: session_id_uuid,
        student_id: Uuid::parse_str(&user_id).unwrap(),
        description: description_text,
        img_url,
        status: "pending".to_string(),
    };

    diesel::insert_into(crate::schema::permissions::table)
        .values(&new_permission)
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(new_permission)))
}

#[derive(serde::Serialize)]
pub struct StudentDashboardMetrics {
    pub overall_attendance: f64,
    pub courses_performance: Vec<StudentCoursePerformance>,
    pub attendance_trend: Vec<StudentAttendanceTrend>,
}

#[derive(serde::Serialize)]
pub struct StudentCoursePerformance {
    pub course_name: String,
    pub percentage: f64,
}

#[derive(serde::Serialize)]
pub struct StudentAttendanceTrend {
    pub date: String,
    pub status: String,
}

pub async fn get_student_dashboard_metrics_handler(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
) -> Result<(StatusCode, Json<StudentDashboardMetrics>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let student_uuid = Uuid::parse_str(&user_id).map_err(internal_error)?;

    // 1. Get all records for this student
    let records = attendance_record::table
        .filter(attendance_record::student_id.eq(student_uuid))
        .load::<AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    if records.is_empty() {
        return Ok((StatusCode::OK, Json(StudentDashboardMetrics {
            overall_attendance: 0.0,
            courses_performance: Vec::new(),
            attendance_trend: Vec::new(),
        })));
    }

    let total_present = records.iter().filter(|r| r.status == "present").count();
    let overall_attendance = (total_present as f64 / records.len() as f64) * 100.0;

    // 2. Get sessions to group by course
    let session_ids: Vec<Uuid> = records.iter().map(|r| r.session_id).collect();
    use crate::schema::sessions;
    let student_sessions = sessions::table
        .filter(sessions::id.eq_any(&session_ids))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    // 3. Performance by Course
    let mut course_map: std::collections::HashMap<Uuid, (usize, usize)> = std::collections::HashMap::new();
    for record in &records {
        if let Some(session) = student_sessions.iter().find(|s| s.id == record.session_id) {
            let entry = course_map.entry(session.course_id).or_insert((0, 0));
            if record.status == "present" {
                entry.0 += 1;
            }
            entry.1 += 1;
        }
    }

    let mut courses_performance = Vec::new();
    for (course_id, (present, total)) in course_map {
        courses_performance.push(StudentCoursePerformance {
            course_name: course_id.to_string()[..8].to_string(), // Use course ID prefix as name for now
            percentage: (present as f64 / total as f64) * 100.0,
        });
    }

    // 4. Attendance Trend (Last 7 sessions)
    let mut attendance_trend = Vec::new();
    let mut sorted_records = records.clone();
    // Sort by session ID (chronological)
    sorted_records.sort_by_key(|r| r.session_id);
    
    for record in sorted_records.iter().rev().take(7).rev() {
        attendance_trend.push(StudentAttendanceTrend {
            date: record.session_id.to_string()[..8].to_string(),
            status: record.status.clone(),
        });
    }

    Ok((StatusCode::OK, Json(StudentDashboardMetrics {
        overall_attendance,
        courses_performance,
        attendance_trend,
    })))
}