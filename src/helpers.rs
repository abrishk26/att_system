use axum::{http::StatusCode, Json};
use crate::types::ErrorResponse;

pub fn internal_error<E>(err: E) -> (StatusCode, Json<ErrorResponse>)
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
