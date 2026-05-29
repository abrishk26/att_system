use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use uuid::Uuid;

use crate::analytics::{self, AnalyticsQuery, ReportBuildRequest};
use crate::types::{AdminClaims, AppState, ErrorResponse};

/// GET /admin/analytics/university
pub async fn university_intelligence_handler(
    State(state): State<AppState>,
    _: AdminClaims,
    Query(q): Query<AnalyticsQuery>,
) -> Result<(StatusCode, Json<analytics::UniversityIntelligence>), (StatusCode, Json<ErrorResponse>)> {
    let intel = analytics::university_intelligence(&state, &q).await?;
    Ok((StatusCode::OK, Json(intel)))
}

/// GET /admin/analytics/student/:student_id
pub async fn student_analytics_handler(
    State(state): State<AppState>,
    _: AdminClaims,
    Path(student_id): Path<Uuid>,
    Query(q): Query<AnalyticsQuery>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<ErrorResponse>)> {
    let v = analytics::student_intel(&state, student_id, &q).await?;
    Ok((StatusCode::OK, Json(v)))
}

/// POST /admin/reports/build
pub async fn report_build_handler(
    State(state): State<AppState>,
    _: AdminClaims,
    Json(req): Json<ReportBuildRequest>,
) -> Result<(StatusCode, Json<analytics::ReportDocument>), (StatusCode, Json<ErrorResponse>)> {
    let doc = analytics::build_report_document(&state, &req).await?;
    Ok((StatusCode::OK, Json(doc)))
}
