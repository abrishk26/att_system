use crate::types::*;
use axum::{extract::{State, Path, Query}, Json, http::{StatusCode, Method}};
use crate::models::{
    Assignment, AttendanceRecord, Class, Course, CreateRecordRequest,
    CreateSessionRequest, Session, UpdateSessionRequest, UserProfile,
    Permission, PermissionWithStudent, UpdatePermissionStatusRequest, StudentProfile,
};
use crate::schema::{sessions, attendance_record, permissions};
use crate::helpers::internal_error;
use uuid::Uuid;
use diesel::{ExpressionMethods, QueryDsl};
use serde::Serialize;

pub async fn create_session_handler(
    State(state): State<AppState>,
    InstructorClaims { .. }: InstructorClaims,
    Json(payload): Json<CreateSessionRequest>,
) -> Result<(StatusCode, Json<Session>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let new_session = Session {
        id: Uuid::now_v7(),
        instructor_id: payload.instructor_id,
        class_id: payload.class_id,
        course_id: payload.course_id,
        status: "incoming".to_string(),
    };

    diesel::insert_into(sessions::table)
        .values(&new_session)
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(new_session)))
}

pub async fn update_session_handler(
    State(state): State<AppState>,
    InstructorClaims { .. }: InstructorClaims,
    Json(payload): Json<UpdateSessionRequest>,
) -> Result<(StatusCode, Json<Session>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let session = diesel::update(sessions::table.find(payload.session_id))
        .set(sessions::status.eq(payload.status))
        .get_result::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(session)))
}

pub async fn get_sessions(
    State(state): State<AppState>,
    _: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<Session>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let sessions = crate::schema::sessions::table
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(sessions)))
}

pub async fn create_record_handler(
    State(state): State<AppState>,
    InstructorClaims { .. }: InstructorClaims,
    Json(payload): Json<CreateRecordRequest>,
) -> Result<(StatusCode, Json<Vec<AttendanceRecord>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // Get the session to find the class_id
    let session = sessions::table
        .find(payload.session_id)
        .get_result::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    // Get all students in that class
    let response = state
        .client
        .request(
            Method::GET,
            format!(
                "http://127.0.0.1:3000/student?course_id={}&class_id={}",
                session.course_id, session.class_id
            ),
        )
        .send()
        .await
        .map_err(internal_error)?;

    let students = match response.status() {
        StatusCode::OK => response.json::<Vec<StudentProfile>>().await.map_err(internal_error)?,
        _ => {
            return Err((
                response.status(),
                Json(ErrorResponse {
                    message: "failed to fetch students from data source".to_string(),
                }),
            ));
        }
    };

    // Create attendance records
    let new_records: Vec<AttendanceRecord> = students
        .into_iter()
        .map(|student| AttendanceRecord {
            id: Uuid::now_v7(),
            student_id: student.id,
            session_id: payload.session_id,
            status: "absent".to_string(), // Default status
        })
        .collect();

    // Bulk insert
    diesel::insert_into(attendance_record::table)
        .values(&new_records)
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(new_records)))
}

pub async fn get_profile(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, role: _ }: ClaimsExtractor,
) -> Result<(StatusCode, Json<UserProfile>), (StatusCode, Json<ErrorResponse>)> {
    let response = state
        .client
        .request(Method::GET, format!("http://127.0.0.1:3000/user/{}", user_id))
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        return Err((
            response.status(),
            Json(ErrorResponse {
                message: "failed to fetch profile from data source".to_string(),
            }),
        ));
    }

    let mut profile = response.json::<UserProfile>().await.map_err(internal_error)?;

    if profile.role == "student" {
        let response = state
            .client
            .request(Method::GET, format!("http://127.0.0.1:3000/student/profile?id={}", user_id))
            .send()
            .await
            .map_err(internal_error)?;

        if response.status() == StatusCode::OK {
            if let Ok(student_profile) = response.json::<StudentProfile>().await {
                profile.nfc_id = Some(student_profile.nfc_id);
            }
        }
    }

    Ok((StatusCode::OK, Json(profile)))
}

pub async fn get_course_details(
    State(state): State<AppState>,
    Path(course_id): Path<Uuid>,
    _: ClaimsExtractor,
) -> Result<(StatusCode, Json<Course>), (StatusCode, Json<ErrorResponse>)> {
    let response = state
        .client
        .request(Method::GET, format!("http://127.0.0.1:3000/course/{}", course_id))
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        return Err((
            response.status(),
            Json(ErrorResponse {
                message: "failed to fetch course details".to_string(),
            }),
        ));
    }

    let course = response.json::<Course>().await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(course)))
}

pub async fn get_class_details(
    State(state): State<AppState>,
    Path(class_id): Path<Uuid>,
    _: ClaimsExtractor,
) -> Result<(StatusCode, Json<Class>), (StatusCode, Json<ErrorResponse>)> {
    let response = state
        .client
        .request(Method::GET, format!("http://127.0.0.1:3000/class/{}", class_id))
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        return Err((
            response.status(),
            Json(ErrorResponse {
                message: "failed to fetch class details".to_string(),
            }),
        ));
    }

    let class = response.json::<Class>().await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(class)))
}

pub async fn get_instructor_assignments(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<Assignment>>), (StatusCode, Json<ErrorResponse>)> {
    let response = state
        .client
        .request(
            Method::GET,
            format!("http://127.0.0.1:3000/instructor/assignment/{}", user_id),
        )
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        // Save status before response.json() moves the response
        let status = response.status();
        
        // Try to get error message from data_source
        let err_msg = if let Ok(err_resp) = response.json::<ErrorResponse>().await {
            format!("data_source: {}", err_resp.message)
        } else {
            "failed to fetch instructor assignments from data source".to_string()
        };
        
        log::error!("Instructor assignments fetch failed ({}): {}", status, err_msg);
        
        return Err((
            status,
            Json(ErrorResponse {
                message: err_msg,
            }),
        ));
    }

    let assignments = response
        .json::<Vec<Assignment>>()
        .await
        .map_err(internal_error)?;
    Ok((StatusCode::OK, Json(assignments)))
}


pub async fn get_sessions_by_instructor(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<Session>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let sessions = sessions::table
        .filter(sessions::instructor_id.eq(Uuid::parse_str(&user_id).unwrap()))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(sessions)))
}

pub async fn get_permissions_by_session(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    _: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<PermissionWithStudent>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let found_permissions = permissions::table
        .filter(permissions::session_id.eq(session_id))
        .load::<Permission>(&mut conn)
        .await
        .map_err(internal_error)?;

    let mut enriched_permissions = Vec::new();

    for permission in found_permissions {
        let response = state
            .client
            .request(
                Method::GET,
                format!(
                    "http://127.0.0.1:3000/student/profile?id={}",
                    permission.student_id
                ),
            )
            .send()
            .await
            .map_err(internal_error)?;

        let student_name = if response.status() == StatusCode::OK {
            let student_info = response.json::<StudentProfile>().await.map_err(internal_error)?;
            format!(
                "{} {}",
                student_info.first_name,
                student_info.last_name.unwrap_or_default()
            )
        } else {
            "Unknown Student".to_string()
        };

        enriched_permissions.push(PermissionWithStudent {
            id: permission.id,
            session_id: permission.session_id,
            student_id: permission.student_id,
            student_name,
            description: permission.description,
            img_url: permission.img_url,
            status: permission.status,
        });
    }

    Ok((StatusCode::OK, Json(enriched_permissions)))
}

pub async fn get_all_permissions_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<PermissionWithStudent>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let instructor_id = Uuid::parse_str(&user_id).unwrap();

    // 1. Get all sessions for this instructor
    let instructor_sessions = sessions::table
        .filter(sessions::instructor_id.eq(instructor_id))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    let session_ids: Vec<Uuid> = instructor_sessions.iter().map(|s| s.id).collect();

    if session_ids.is_empty() {
        return Ok((StatusCode::OK, Json(Vec::new())));
    }

    // 2. Get all permissions for these sessions
    let found_permissions = permissions::table
        .filter(permissions::session_id.eq_any(session_ids))
        .load::<Permission>(&mut conn)
        .await
        .map_err(internal_error)?;

    // 3. Enrich permissions with student name
    let mut enriched_permissions = Vec::new();
    for permission in found_permissions {
        let response = state
            .client
            .request(
                Method::GET,
                format!(
                    "http://127.0.0.1:3000/student/profile?id={}",
                    permission.student_id
                ),
            )
            .send()
            .await
            .map_err(internal_error)?;

        let student_name = if response.status() == StatusCode::OK {
            let student_info = response.json::<StudentProfile>().await.map_err(internal_error)?;
            format!(
                "{} {}",
                student_info.first_name,
                student_info.last_name.unwrap_or_default()
            )
        } else {
            "Unknown Student".to_string()
        };

        enriched_permissions.push(PermissionWithStudent {
            id: permission.id,
            session_id: permission.session_id,
            student_id: permission.student_id,
            student_name,
            description: permission.description,
            img_url: permission.img_url,
            status: permission.status,
        });
    }

    Ok((StatusCode::OK, Json(enriched_permissions)))
}

pub async fn update_permission_handler(
    State(state): State<AppState>,
    Path(permission_id): Path<Uuid>,
    InstructorClaims { .. }: InstructorClaims,
    Json(payload): Json<UpdatePermissionStatusRequest>,
) -> Result<(StatusCode, Json<Permission>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // Normalize status: map 'approved' -> 'accepted' for backward compatibility
    let status = match payload.status.to_lowercase().as_str() {
        "accepted" | "approved" => "accepted".to_string(),
        "rejected" => "rejected".to_string(),
        "pending" => "pending".to_string(),
        other => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    message: format!("Invalid permission status: '{}'. Allowed: accepted, rejected, pending", other),
                }),
            ));
        }
    };

    let updated_permission = diesel::update(permissions::table.find(permission_id))
        .set(permissions::status.eq(&status))
        .get_result::<Permission>(&mut conn)
        .await
        .map_err(internal_error)?;

    // If accepted, try to update the attendance record to excused (best-effort)
    if status == "accepted" {
        let excused_result = diesel::update(attendance_record::table)
            .filter(attendance_record::student_id.eq(updated_permission.student_id))
            .filter(attendance_record::session_id.eq(updated_permission.session_id))
            .set(attendance_record::status.eq("excused"))
            .execute(&mut conn)
            .await;
        
        if let Err(e) = excused_result {
            log::warn!("Could not mark attendance as excused (constraint may need updating): {}", e);
        }
    }

    Ok((StatusCode::OK, Json(updated_permission)))
}

pub async fn get_student_count_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    InstructorClaims { .. }: InstructorClaims,
) -> Result<(StatusCode, Json<usize>), (StatusCode, Json<ErrorResponse>)> {
    let course_id = params.get("course_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "course_id missing".to_string() })))?;
    let class_id = params.get("class_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "class_id missing".to_string() })))?;

    let response = state
        .client
        .request(
            Method::GET,
            format!("http://127.0.0.1:3000/student?course_id={}&class_id={}", course_id, class_id),
        )
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        return Ok((StatusCode::OK, Json(0)));
    }

    let students = response.json::<Vec<StudentProfile>>().await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(students.len())))
}

pub async fn get_students_by_course_class_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    InstructorClaims { .. }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<StudentProfile>>), (StatusCode, Json<ErrorResponse>)> {
    let course_id = params.get("course_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "course_id missing".to_string() })))?;
    let class_id = params.get("class_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "class_id missing".to_string() })))?;

    let response = state
        .client
        .request(
            Method::GET,
            format!("http://127.0.0.1:3000/student?course_id={}&class_id={}", course_id, class_id),
        )
        .send()
        .await
        .map_err(internal_error)?;

    if response.status() != StatusCode::OK {
        return Ok((StatusCode::OK, Json(Vec::new())));
    }

    let mut students = response.json::<Vec<StudentProfile>>().await.map_err(internal_error)?;

    // Calculate attendance for each student
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // 1. Find all finished sessions for this course and class
    let course_sessions = sessions::table
        .filter(sessions::course_id.eq(Uuid::parse_str(course_id).map_err(internal_error)?))
        .filter(sessions::class_id.eq(Uuid::parse_str(class_id).map_err(internal_error)?))
        .filter(sessions::status.eq("finished"))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    let total_sessions = course_sessions.len();
    let session_ids: Vec<Uuid> = course_sessions.into_iter().map(|s| s.id).collect();

    if total_sessions > 0 {
        // 2. Get all 'present' records for these sessions
        let records = attendance_record::table
            .filter(attendance_record::session_id.eq_any(session_ids))
            .filter(attendance_record::status.eq("present"))
            .load::<AttendanceRecord>(&mut conn)
            .await
            .map_err(internal_error)?;

        // 3. Group by student_id and count
        let mut attendance_counts = std::collections::HashMap::new();
        for record in records {
            *attendance_counts.entry(record.student_id).or_insert(0) += 1;
        }

        // 4. Update student profiles with percentage
        for student in &mut students {
            let present_count = *attendance_counts.get(&student.id).unwrap_or(&0);
            student.attendance_percentage = Some((present_count as f64 / total_sessions as f64) * 100.0);
        }
    } else {
        for student in &mut students {
            student.attendance_percentage = Some(0.0);
        }
    }

    Ok((StatusCode::OK, Json(students)))
}

pub async fn get_attendance_stats_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<f64>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // Get all finished sessions for this instructor
    let instructor_sessions = sessions::table
        .filter(sessions::instructor_id.eq(Uuid::parse_str(&user_id).unwrap()))
        .filter(sessions::status.eq("finished"))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    if instructor_sessions.is_empty() {
        return Ok((StatusCode::OK, Json(0.0)));
    }

    let mut total_records = 0;
    let mut present_records = 0;

    for session in instructor_sessions {
        let records = attendance_record::table
            .filter(attendance_record::session_id.eq(session.id))
            .load::<AttendanceRecord>(&mut conn)
            .await
            .map_err(internal_error)?;
        
        total_records += records.len();
        present_records += records.iter().filter(|r| r.status == "present").count();
    }

    let percentage = if total_records > 0 {
        (present_records as f64 / total_records as f64) * 100.0
    } else {
        0.0
    };

    Ok((StatusCode::OK, Json(percentage)))
}

#[derive(Serialize)]
pub struct InstructorDashboardMetrics {
    pub stats: InstructorStats,
    pub trends: Vec<AttendanceTrend>,
    pub course_performance: Vec<CoursePerformance>,
}

#[derive(Serialize)]
pub struct InstructorStats {
    pub active_courses: usize,
    pub total_sessions: usize,
    pub avg_attendance: f64,
    pub total_students: usize,
}

#[derive(Serialize)]
pub struct AttendanceTrend {
    pub date: String,
    pub rate: f64,
}

#[derive(Serialize)]
pub struct CoursePerformance {
    pub course_id: String,
    pub attendance_rate: f64,
}

pub async fn get_instructor_dashboard_metrics_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<InstructorDashboardMetrics>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let instructor_uuid = Uuid::parse_str(&user_id).map_err(internal_error)?;

    // 1. Get all assignments to count courses
    let assignments_resp = state.client.get(format!("http://127.0.0.1:3000/instructor/assignment/{}", user_id))
        .send().await.map_err(internal_error)?;
    let assignments: Vec<Assignment> = if assignments_resp.status() == StatusCode::OK {
        assignments_resp.json().await.map_err(internal_error)?
    } else { Vec::new() };

    // 2. Get all sessions for this instructor
    let all_sessions = sessions::table
        .filter(sessions::instructor_id.eq(instructor_uuid))
        .load::<Session>(&mut conn)
        .await
        .map_err(internal_error)?;

    let completed_sessions: Vec<&Session> = all_sessions.iter().filter(|s| s.status == "finished").collect();
    let session_ids: Vec<Uuid> = completed_sessions.iter().map(|s| s.id).collect();

    // 3. Calculate avg attendance
    let mut total_present = 0;
    let mut total_records = 0;
    let mut trends = Vec::new();
    let mut course_map: std::collections::HashMap<Uuid, (usize, usize)> = std::collections::HashMap::new();

    if !session_ids.is_empty() {
        let records = attendance_record::table
            .filter(attendance_record::session_id.eq_any(&session_ids))
            .load::<AttendanceRecord>(&mut conn)
            .await
            .map_err(internal_error)?;

        total_records = records.len();
        total_present = records.iter().filter(|r| r.status == "present").count();

        // Trend calculation (simplified: grouping by session for now, normally would be by date)
        let mut sorted_sessions = completed_sessions.clone();
        sorted_sessions.sort_by_key(|s| s.id);
        
        for sess in sorted_sessions.iter().rev().take(7).rev() {
            let sess_records: Vec<_> = records.iter().filter(|r| r.session_id == sess.id).collect();
            let rate = if !sess_records.is_empty() {
                (sess_records.iter().filter(|r| r.status == "present").count() as f64 / sess_records.len() as f64) * 100.0
            } else { 0.0 };
            
            trends.push(AttendanceTrend {
                date: sess.id.to_string()[..8].to_string(), // Short identifier for trend
                rate,
            });

            let entry = course_map.entry(sess.course_id).or_insert((0, 0));
            entry.0 += sess_records.iter().filter(|r| r.status == "present").count();
            entry.1 += sess_records.len();
        }
    }

    let avg_attendance = if total_records > 0 {
        (total_present as f64 / total_records as f64) * 100.0
    } else { 0.0 };

    // 4. Course Performance
    let mut course_performance = Vec::new();
    for (course_id, (present, total)) in course_map {
        course_performance.push(CoursePerformance {
            course_id: course_id.to_string()[..8].to_string(),
            attendance_rate: if total > 0 { (present as f64 / total as f64) * 100.0 } else { 0.0 },
        });
    }

    // 5. Unique Student Count
    let total_students = if !session_ids.is_empty() {
        let records = attendance_record::table
            .filter(attendance_record::session_id.eq_any(&session_ids))
            .load::<AttendanceRecord>(&mut conn)
            .await
            .map_err(internal_error)?;
        
        let mut unique_students = std::collections::HashSet::new();
        for record in records {
            unique_students.insert(record.student_id);
        }
        unique_students.len()
    } else { 0 };

    Ok((StatusCode::OK, Json(InstructorDashboardMetrics {
        stats: InstructorStats {
            active_courses: assignments.len(),
            total_sessions: all_sessions.len(),
            avg_attendance,
            total_students,
        },
        trends,
        course_performance,
    })))
}
