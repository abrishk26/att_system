mod models;
mod schema;

use crate::models::{
    AttendanceRecord, CreateRecordRequest, CreateSessionRequest, Session, UpdateRecordRequest,
    UpdateSessionRequest,
};
use crate::schema::attendance_record;
use axum::{
    Router,
    extract::{Json, Path, State},
    http::StatusCode,
    routing::{get, patch, post},
};
use diesel::{BoolExpressionMethods, ExpressionMethods, QueryDsl};
use diesel_async::{
    AsyncPgConnection, RunQueryDsl,
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

async fn create_session(
    State(state): State<AppState>,
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

    diesel::insert_into(crate::schema::sessions::table)
        .values(&new_session)
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(new_session)))
}

async fn update_session(
    State(state): State<AppState>,
    Json(payload): Json<UpdateSessionRequest>,
) -> Result<(StatusCode, Json<Session>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let session = diesel::update(crate::schema::sessions::table.find(payload.session_id))
        .set(crate::schema::sessions::status.eq(payload.status))
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

async fn create_record(
    State(state): State<AppState>,
    Json(payload): Json<CreateRecordRequest>,
) -> Result<(StatusCode, Json<Vec<AttendanceRecord>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // Get the session to find the class_id
    let session = crate::schema::sessions::table
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
                "http://127.0.0.1:3000/students?course_id={}&class_id{}",
                session.course_id, session.class_id
            ),
        )
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

    let students = match response.status() {
        StatusCode::OK => response.json::<Vec<String>>().await.map_err(|e| {
            log::error!("Error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "internal server error".to_string(),
                }),
            )
        })?,
        StatusCode::BAD_REQUEST => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "invalid username or password".to_string(),
                }),
            ));
        }
        _ => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "internal server error".to_string(),
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
    diesel::insert_into(crate::schema::attendance_record::table)
        .values(&new_records)
        .execute(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::CREATED, Json(new_records)))
}

#[derive(Deserialize)]
struct Id {
    id: Uuid,
}

async fn mark_attendance(
    State(state): State<AppState>,
    Json(payload): Json<UpdateRecordRequest>,
) -> Result<(StatusCode, Json<AttendanceRecord>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let response = state
        .client
        .request(
            Method::GET,
            format!("127.0.0.1:3000/student/profile?nfc_id={}", payload.nfc_id),
        )
        .send()
        .await
        .map_err(internal_error)?;

    let student_id = match response.status() {
        StatusCode::OK => response
            .json::<Id>()
            .await
            .map_err(|e| {
                log::error!("Error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        message: "internal server error".to_string(),
                    }),
                )
            })
            .map(|v| v.id)?,
        StatusCode::BAD_REQUEST => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    message: "invalid username or password".to_string(),
                }),
            ));
        }
        _ => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    message: "internal server error".to_string(),
                }),
            ));
        }
    };

    let record = diesel::update(crate::schema::attendance_record::table)
        .filter(
            attendance_record::session_id
                .eq(payload.session_id)
                .and(attendance_record::student_id.eq(student_id)),
        )
        .set(crate::schema::attendance_record::status.eq(payload.status))
        .get_result::<AttendanceRecord>(&mut conn)
        .await
        .map_err(internal_error)?;

    Ok((StatusCode::OK, Json(record)))
}

async fn get_records(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
) -> Result<(StatusCode, Json<Vec<AttendanceRecord>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let records = crate::schema::attendance_record::table
        .filter(crate::schema::attendance_record::session_id.eq(session_id))
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
    env_logger::init();

    let db_url = std::env::var("DATABASE_URL").unwrap();

    // set up connection pool
    let config = AsyncDieselConnectionManager::<diesel_async::AsyncPgConnection>::new(db_url);
    let pool = bb8::Pool::builder().build(config).await.unwrap();
    let client = ClientBuilder::new().build().unwrap();
    let app_state = AppState { client, pool };
    let app = Router::new()
        .route("/", get(|| async { "Hello, World!\n" }))
        .route("/login", post(login_handler))
        .route("/refresh", post(refresh_handler))
        .route("/session/create", post(create_session))
        .route("/record/create", post(create_record))
        .route("/session/update", patch(update_session))
        .route("/record/update", patch(mark_attendance))
        .route("/session", get(get_sessions))
        .route("/record/:session_id", get(get_records))
        .with_state(app_state);
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("unable to bind listening address");

    println!("Listening on port 3001");
    axum::serve(listener, app).await.unwrap();
}
