use crate::types::*;
use axum::{extract::{State, Path}, Json, http::{StatusCode, Method}};
use crate::models::{
    Assignment, AttendanceRecord, Class, Course, CreateRecordRequest,
    CreateSessionRequest, Session, UpdateSessionRequest, UserProfile,
};
use crate::schema::{sessions, attendance_record};
use crate::helpers::internal_error;
use uuid::Uuid;
use diesel::{ExpressionMethods, QueryDsl};

pub async fn create_session_handler(
    State(state): State<AppState>,
    _: ClaimsExtractor,
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
    _: ClaimsExtractor,
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
    _: ClaimsExtractor,
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
        StatusCode::OK => response.json::<Vec<String>>().await.map_err(internal_error)?,
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
            student_id: Uuid::parse_str(&student).unwrap(),
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
    ClaimsExtractor(user_id): ClaimsExtractor,
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

    let profile = response.json::<UserProfile>().await.map_err(internal_error)?;
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
    ClaimsExtractor(user_id): ClaimsExtractor,
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
        return Err((
            response.status(),
            Json(ErrorResponse {
                message: "failed to fetch instructor assignments".to_string(),
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
    ClaimsExtractor(user_id): ClaimsExtractor,
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
