use crate::types::*;
use axum::{extract::{State, Path, Query}, Json, http::{StatusCode, Method}};
use crate::models::*;
use crate::schema::{sessions, attendance_record, permissions};
use crate::helpers::internal_error;
use uuid::Uuid;
use diesel::{ExpressionMethods, QueryDsl};
use serde::Serialize;
use chrono::Utc;

const VALID_STATUSES: &[&str] = &["present", "absent", "late", "excused"];

fn validate_status(s: &str) -> Result<(), (StatusCode, Json<ErrorResponse>)> {
    if VALID_STATUSES.contains(&s) { Ok(()) } else {
        Err((StatusCode::BAD_REQUEST, Json(ErrorResponse {
            message: format!("Invalid status value '{}'. Must be one of: present, absent, late, excused", s),
        })))
    }
}

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
        created_at: Utc::now(),
    };
    diesel::insert_into(sessions::table).values(&new_session).execute(&mut conn).await.map_err(internal_error)?;
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
        .get_result::<Session>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(session)))
}

pub async fn get_sessions(
    State(state): State<AppState>,
    _: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<Session>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let s = crate::schema::sessions::table.load::<Session>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(s)))
}

pub async fn create_record_handler(
    State(state): State<AppState>,
    InstructorClaims { .. }: InstructorClaims,
    Json(payload): Json<CreateRecordRequest>,
) -> Result<(StatusCode, Json<Vec<AttendanceRecord>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let session = sessions::table.find(payload.session_id).get_result::<Session>(&mut conn).await.map_err(internal_error)?;
    let response = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student?course_id={}&class_id={}", session.course_id, session.class_id)).send().await.map_err(internal_error)?;
    let students = match response.status() {
        StatusCode::OK => response.json::<Vec<StudentProfile>>().await.map_err(internal_error)?,
        _ => return Err((response.status(), Json(ErrorResponse { message: "failed to fetch students".to_string() }))),
    };
    let new_records: Vec<AttendanceRecord> = students.into_iter().map(|s| AttendanceRecord {
        id: Uuid::now_v7(), student_id: s.id, session_id: payload.session_id,
        status: "absent".to_string(), client_id: None,
    }).collect();
    diesel::insert_into(attendance_record::table).values(&new_records).execute(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::CREATED, Json(new_records)))
}

pub async fn get_profile(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, role: _ }: ClaimsExtractor,
) -> Result<(StatusCode, Json<UserProfile>), (StatusCode, Json<ErrorResponse>)> {
    let response = state.client.request(Method::GET, format!("http://127.0.0.1:3000/user/{}", user_id)).send().await.map_err(internal_error)?;
    if response.status() != StatusCode::OK {
        return Err((response.status(), Json(ErrorResponse { message: "failed to fetch profile".to_string() })));
    }
    let mut profile = response.json::<UserProfile>().await.map_err(internal_error)?;
    if profile.role == "student" {
        let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?id={}", user_id)).send().await.map_err(internal_error)?;
        if r.status() == StatusCode::OK {
            if let Ok(sp) = r.json::<StudentProfile>().await { profile.nfc_id = Some(sp.nfc_id); }
        }
    }
    Ok((StatusCode::OK, Json(profile)))
}

pub async fn get_course_details(
    State(state): State<AppState>,
    Path(course_id): Path<Uuid>,
    _: ClaimsExtractor,
) -> Result<(StatusCode, Json<Course>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/course/{}", course_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK { return Err((r.status(), Json(ErrorResponse { message: "failed to fetch course".to_string() }))); }
    Ok((StatusCode::OK, Json(r.json::<Course>().await.map_err(internal_error)?)))
}

pub async fn get_class_details(
    State(state): State<AppState>,
    Path(class_id): Path<Uuid>,
    _: ClaimsExtractor,
) -> Result<(StatusCode, Json<Class>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/class/{}", class_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK { return Err((r.status(), Json(ErrorResponse { message: "failed to fetch class".to_string() }))); }
    Ok((StatusCode::OK, Json(r.json::<Class>().await.map_err(internal_error)?)))
}

pub async fn get_instructor_assignments(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<Assignment>>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/instructor/assignment/{}", user_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK {
        let status = r.status();
        let msg = r.json::<ErrorResponse>().await.map(|e| e.message).unwrap_or("failed to fetch assignments".into());
        return Err((status, Json(ErrorResponse { message: msg })));
    }
    Ok((StatusCode::OK, Json(r.json::<Vec<Assignment>>().await.map_err(internal_error)?)))
}

/// B-08: GET /instructor/assignments/enriched
pub async fn get_enriched_assignments_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<EnrichedAssignment>>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/instructor/assignment/enriched/{}", user_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK {
        return Err((r.status(), Json(ErrorResponse { message: "failed to fetch enriched assignments".into() })));
    }
    Ok((StatusCode::OK, Json(r.json::<Vec<EnrichedAssignment>>().await.map_err(internal_error)?)))
}

/// B-04: GET /schedule
pub async fn get_schedule_handler(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<ScheduleItem>>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/schedule/{}", user_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK {
        return Err((r.status(), Json(ErrorResponse { message: "failed to fetch schedule".into() })));
    }
    Ok((StatusCode::OK, Json(r.json::<Vec<ScheduleItem>>().await.map_err(internal_error)?)))
}

pub async fn get_sessions_by_instructor(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
    Query(params): Query<SessionsQueryParams>,
) -> Result<(StatusCode, Json<Vec<Session>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use diesel::ExpressionMethods;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let instructor_uuid = Uuid::parse_str(&user_id).unwrap();
    
    let mut query = sessions::table.filter(sessions::instructor_id.eq(instructor_uuid)).into_boxed();
    
    if let Some(c_id) = params.course_id {
        query = query.filter(sessions::course_id.eq(c_id));
    }
    if let Some(cl_id) = params.class_id {
        query = query.filter(sessions::class_id.eq(cl_id));
    }
    if let Some(date_str) = params.date {
        // Assuming date_str is "YYYY-MM-DD"
        if let Ok(date) = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
            let start_of_day = date.and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Utc).unwrap();
            let end_of_day = date.and_hms_opt(23, 59, 59).unwrap().and_local_timezone(chrono::Utc).unwrap();
            query = query.filter(sessions::created_at.ge(start_of_day))
                         .filter(sessions::created_at.le(end_of_day));
        }
    }

    let s = query.load::<Session>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(s)))
}

async fn enrich_permission(state: &AppState, p: Permission) -> Result<PermissionWithStudent, (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?id={}", p.student_id)).send().await.map_err(internal_error)?;
    let student_name = if r.status() == StatusCode::OK {
        let sp = r.json::<StudentProfile>().await.map_err(internal_error)?;
        format!("{} {}", sp.first_name, sp.last_name.unwrap_or_default())
    } else { "Unknown Student".to_string() };
    Ok(PermissionWithStudent { id: p.id, session_id: p.session_id, student_id: p.student_id, student_name, description: p.description, img_url: p.img_url, status: p.status, created_at: p.created_at })
}

/// B-02+B-09+B-10: GET /instructor/permissions?status=&limit=&offset=
pub async fn get_all_permissions_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
    Query(params): Query<PermissionsQueryParams>,
) -> Result<(StatusCode, Json<Vec<PermissionWithStudent>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let instructor_id = Uuid::parse_str(&user_id).unwrap();
    let session_ids: Vec<Uuid> = sessions::table.filter(sessions::instructor_id.eq(instructor_id)).load::<Session>(&mut conn).await.map_err(internal_error)?.into_iter().map(|s| s.id).collect();
    if session_ids.is_empty() { return Ok((StatusCode::OK, Json(Vec::new()))); }

    let mut query = permissions::table.filter(permissions::session_id.eq_any(&session_ids)).into_boxed();
    if let Some(ref s) = params.status { query = query.filter(permissions::status.eq(s)); }

    let found = query.load::<Permission>(&mut conn).await.map_err(internal_error)?;
    let mut enriched = Vec::new();
    for p in found { enriched.push(enrich_permission(&state, p).await?); }
    Ok((StatusCode::OK, Json(enriched)))
}

/// GET /instructor/permissions/:session_id
pub async fn get_permissions_by_session(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    _: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<PermissionWithStudent>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let found = permissions::table.filter(permissions::session_id.eq(session_id)).load::<Permission>(&mut conn).await.map_err(internal_error)?;
    let mut enriched = Vec::new();
    for p in found { enriched.push(enrich_permission(&state, p).await?); }
    Ok((StatusCode::OK, Json(enriched)))
}

pub async fn update_permission_handler(
    State(state): State<AppState>,
    Path(permission_id): Path<Uuid>,
    InstructorClaims { .. }: InstructorClaims,
    Json(payload): Json<UpdatePermissionStatusRequest>,
) -> Result<(StatusCode, Json<Permission>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let status = match payload.status.to_lowercase().as_str() {
        "accepted" | "approved" => "accepted".to_string(),
        "rejected" => "rejected".to_string(),
        "pending" => "pending".to_string(),
        other => return Err((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: format!("Invalid permission status: '{}'. Allowed: accepted, rejected, pending", other) }))),
    };
    let updated = diesel::update(permissions::table.find(permission_id)).set(permissions::status.eq(&status)).get_result::<Permission>(&mut conn).await.map_err(internal_error)?;
    if status == "accepted" {
        let _ = diesel::update(attendance_record::table)
            .filter(attendance_record::student_id.eq(updated.student_id))
            .filter(attendance_record::session_id.eq(updated.session_id))
            .set(attendance_record::status.eq("excused"))
            .execute(&mut conn).await;
    }
    Ok((StatusCode::OK, Json(updated)))
}

pub async fn get_student_count_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    InstructorClaims { .. }: InstructorClaims,
) -> Result<(StatusCode, Json<usize>), (StatusCode, Json<ErrorResponse>)> {
    let course_id = params.get("course_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "course_id missing".into() })))?;
    let class_id = params.get("class_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "class_id missing".into() })))?;
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student?course_id={}&class_id={}", course_id, class_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK { return Ok((StatusCode::OK, Json(0))); }
    let students = r.json::<Vec<StudentProfile>>().await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(students.len())))
}

pub async fn get_students_by_course_class_handler(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    InstructorClaims { .. }: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<StudentProfile>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let course_id = params.get("course_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "course_id missing".into() })))?;
    let class_id = params.get("class_id").ok_or((StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "class_id missing".into() })))?;
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student?course_id={}&class_id={}", course_id, class_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK { return Ok((StatusCode::OK, Json(Vec::new()))); }
    let mut students = r.json::<Vec<StudentProfile>>().await.map_err(internal_error)?;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let course_sessions = sessions::table.filter(sessions::course_id.eq(Uuid::parse_str(course_id).map_err(internal_error)?)).filter(sessions::class_id.eq(Uuid::parse_str(class_id).map_err(internal_error)?)).filter(sessions::status.eq("finished")).load::<Session>(&mut conn).await.map_err(internal_error)?;
    let total = course_sessions.len();
    let ids: Vec<Uuid> = course_sessions.into_iter().map(|s| s.id).collect();
    if total > 0 {
        let records = attendance_record::table.filter(attendance_record::session_id.eq_any(&ids)).filter(attendance_record::status.eq("present")).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
        let mut counts = std::collections::HashMap::new();
        for r in records { *counts.entry(r.student_id).or_insert(0) += 1; }
        for s in &mut students { let c = *counts.get(&s.id).unwrap_or(&0); s.attendance_percentage = Some((c as f64 / total as f64) * 100.0); }
    } else {
        for s in &mut students { s.attendance_percentage = Some(0.0); }
    }
    Ok((StatusCode::OK, Json(students)))
}

pub async fn get_attendance_stats_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<f64>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let inst_sessions = sessions::table.filter(sessions::instructor_id.eq(Uuid::parse_str(&user_id).unwrap())).filter(sessions::status.eq("finished")).load::<Session>(&mut conn).await.map_err(internal_error)?;
    if inst_sessions.is_empty() { return Ok((StatusCode::OK, Json(0.0))); }
    let mut total = 0; let mut present = 0;
    for s in inst_sessions {
        let recs = attendance_record::table.filter(attendance_record::session_id.eq(s.id)).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
        total += recs.len(); present += recs.iter().filter(|r| r.status == "present").count();
    }
    Ok((StatusCode::OK, Json(if total > 0 { (present as f64 / total as f64) * 100.0 } else { 0.0 })))
}

#[derive(Serialize)] pub struct InstructorDashboardMetrics { pub stats: InstructorStats, pub trends: Vec<TrendPoint>, pub course_performance: Vec<CoursePoint> }
#[derive(Serialize)] pub struct InstructorStats { pub active_courses: usize, pub total_sessions: usize, pub avg_attendance: f64, pub total_students: usize }
#[derive(Serialize)] pub struct TrendPoint { pub date: String, pub rate: f64 }
#[derive(Serialize)] pub struct CoursePoint { pub course_id: String, pub attendance_rate: f64 }

pub async fn get_instructor_dashboard_metrics_handler(
    State(state): State<AppState>,
    InstructorClaims { user_id }: InstructorClaims,
) -> Result<(StatusCode, Json<InstructorDashboardMetrics>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let instructor_uuid = Uuid::parse_str(&user_id).map_err(internal_error)?;
    let assignments_resp = state.client.get(format!("http://127.0.0.1:3000/instructor/assignment/{}", user_id)).send().await.map_err(internal_error)?;
    let assignments: Vec<Assignment> = if assignments_resp.status() == StatusCode::OK { assignments_resp.json().await.map_err(internal_error)? } else { Vec::new() };
    let all_sessions = sessions::table.filter(sessions::instructor_id.eq(instructor_uuid)).load::<Session>(&mut conn).await.map_err(internal_error)?;
    let completed: Vec<&Session> = all_sessions.iter().filter(|s| s.status == "finished").collect();
    let session_ids: Vec<Uuid> = completed.iter().map(|s| s.id).collect();
    let mut total_present = 0; let mut total_records = 0;
    let mut trends = Vec::new(); let mut course_map: std::collections::HashMap<Uuid,(usize,usize)> = Default::default();
    if !session_ids.is_empty() {
        let records = attendance_record::table.filter(attendance_record::session_id.eq_any(&session_ids)).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
        total_records = records.len(); total_present = records.iter().filter(|r| r.status == "present").count();
        let mut sorted = completed.clone(); sorted.sort_by_key(|s| s.id);
        for sess in sorted.iter().rev().take(7).rev() {
            let sess_recs: Vec<_> = records.iter().filter(|r| r.session_id == sess.id).collect();
            let rate = if !sess_recs.is_empty() { (sess_recs.iter().filter(|r| r.status=="present").count() as f64 / sess_recs.len() as f64)*100.0 } else { 0.0 };
            trends.push(TrendPoint { date: sess.created_at.format("%Y-%m-%d").to_string(), rate });
            let e = course_map.entry(sess.course_id).or_insert((0,0));
            e.0 += sess_recs.iter().filter(|r| r.status=="present").count(); e.1 += sess_recs.len();
        }
    }
    let avg = if total_records > 0 { (total_present as f64/total_records as f64)*100.0 } else { 0.0 };
    let course_performance = course_map.into_iter().map(|(id,(p,t))| CoursePoint { course_id: id.to_string()[..8].to_string(), attendance_rate: if t>0{(p as f64/t as f64)*100.0}else{0.0} }).collect();
    let total_students = if !session_ids.is_empty() {
        let recs = attendance_record::table.filter(attendance_record::session_id.eq_any(&session_ids)).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
        recs.into_iter().map(|r| r.student_id).collect::<std::collections::HashSet<_>>().len()
    } else { 0 };
    Ok((StatusCode::OK, Json(InstructorDashboardMetrics { stats: InstructorStats { active_courses: assignments.len(), total_sessions: all_sessions.len(), avg_attendance: avg, total_students }, trends, course_performance })))
}
