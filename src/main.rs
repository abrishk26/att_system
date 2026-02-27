mod models;
mod schema;

use crate::models::{
    Assignment, AttendanceRecord, AttendanceRecordWithStudent, Class, Course, CreateRecordRequest,
    CreateSessionRequest, Session, UpdateRecordRequest, UpdateSessionRequest, UserProfile,
};
use crate::schema::{attendance_record, sessions};
use axum::{
    Router,
    extract::{FromRequestParts, Json, Path, State},
    http::{StatusCode, request::Parts},
    routing::{get, patch, post},
};
use dotenvy::dotenv_override;
use env_logger::Env;
use diesel::{BoolExpressionMethods, ExpressionMethods, QueryDsl};
use diesel_async::{
    AsyncPgConnection,
    pooled_connection::{AsyncDieselConnectionManager, bb8},
};
use jwt_simple::prelude::*;
use reqwest::{Client, ClientBuilder, Method};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

type Pool = bb8::Pool<AsyncPgConnection>;

#[derive(Serialize, Deserialize)]
struct LoginData {
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct RefreshRequest {
    refresh_token: String,
}

#[derive(Serialize)]
struct Tokens {
    access_token: String,
    refresh_token: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

#[derive(Deserialize)]
struct UserData {
    user_id: String,
}

#[derive(Clone)]
struct AppState {
    client: Client,
    pool: Pool,
}

struct ClaimsExtractor(String);

impl<S> FromRequestParts<S> for ClaimsExtractor
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<ErrorResponse>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "missing authorization header".to_string(),
                }),
            ))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "invalid authorization header format".to_string(),
                }),
            ));
        }

        let token = &auth_header[7..];
        let key = HS256Key::from_bytes(
            "raw_llkey_hastobeverylongtobestrongbuttheymakeitatruntime".as_bytes(),
        );

        let claims = key
            .verify_token::<NoCustomClaims>(token, None)
            .map_err(|e| {
                log::error!("Token verification failed: {}", e);
                (
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse {
                        message: "invalid or expired token".to_string(),
                    }),
                )
            })?;

        let user_id = claims.subject.ok_or((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                message: "invalid token subject".to_string(),
            }),
        ))?;

        Ok(ClaimsExtractor(user_id))
    }
}

async fn login_handler(
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

async fn refresh_handler(
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

async fn create_session_handler(
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

async fn update_session_handler(
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

async fn get_sessions(
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

async fn create_record_handler(
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


async fn mark_attendance_handler(
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

async fn get_records_with_student_info(
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

async fn get_profile(
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

async fn get_course_details(
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

async fn get_class_details(
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

async fn get_instructor_assignments(
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

async fn get_student_courses(
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

async fn get_sessions_by_instructor(
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

async fn get_sessions_by_student(
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

fn internal_error<E>(err: E) -> (StatusCode, Json<ErrorResponse>)
where
    E: std::error::Error,
{
    log::error!("Error: {}", err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse {
            message: "internal server error".to_string(),
        }),
    )
}

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();
    dotenv_override().ok();

    let db_url = std::env::var("DATABASE_URL").unwrap();
    log::info!("Database Url: {}", db_url);
    // set up connection pool
    let config = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new(db_url);
    let pool = bb8::Pool::builder().build(config).await.unwrap();
    let client = ClientBuilder::new().build().unwrap();
    let app_state = AppState { client, pool };
    let app = Router::new()
        .route("/", get(|| async { "Hello, World!\n" }))
        .route("/login", post(login_handler))
        .route("/refresh", post(refresh_handler))
        .route("/profile", get(get_profile))
        .route("/instructor/assignments", get(get_instructor_assignments))
        .route("/student/courses", get(get_student_courses))
        .route("/course/{course_id}", get(get_course_details))
        .route("/class/{class_id}", get(get_class_details))
        .route("/session/create", post(create_session_handler))
        .route("/record/create", post(create_record_handler))
        .route("/session/update", patch(update_session_handler))
        .route("/record/update", patch(mark_attendance_handler))
        .route("/sessions/instructor", get(get_sessions_by_instructor))
        .route("/sessions/student", get(get_sessions_by_student))
        .route("/session", get(get_sessions))
        .route("/record/{session_id}", get(get_records_with_student_info))
        .with_state(app_state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("unable to bind listening address");

    println!("Listening on port 3001");
    axum::serve(listener, app).await.unwrap();
}
