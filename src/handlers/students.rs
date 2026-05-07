use uuid::Uuid;
use diesel::{BoolExpressionMethods, ExpressionMethods, QueryDsl};
use axum::{extract::{State, Path, Multipart, Query}, http::{StatusCode, Method}, Json};
use crate::types::*;
use crate::schema::{attendance_record, sessions};
use crate::helpers::internal_error;
use crate::models::*;

const VALID_STATUSES: &[&str] = &["present", "absent", "late", "excused"];

fn validate_status(s: &str) -> Result<(), (StatusCode, Json<ErrorResponse>)> {
    if VALID_STATUSES.contains(&s) { Ok(()) } else {
        Err((StatusCode::BAD_REQUEST, Json(ErrorResponse {
            message: format!("Invalid status value '{}'. Must be one of: present, absent, late, excused", s),
        })))
    }
}

pub async fn get_sessions_by_student(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<AttendanceRecord>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let records = attendance_record::table
        .filter(attendance_record::student_id.eq(Uuid::parse_str(&user_id).unwrap()))
        .load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(records)))
}

pub async fn get_student_courses(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<Course>>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/courses/{}", user_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK { return Err((r.status(), Json(ErrorResponse { message: "failed to fetch student courses".into() }))); }
    Ok((StatusCode::OK, Json(r.json::<Vec<Course>>().await.map_err(internal_error)?)))
}

pub async fn get_records_with_student_info(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    _: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<AttendanceRecordWithStudent>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let records = attendance_record::table.filter(attendance_record::session_id.eq(session_id)).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
    let mut enriched = Vec::new();
    for record in records {
        let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?id={}", record.student_id)).send().await.map_err(internal_error)?;
        if r.status() == StatusCode::OK {
            if let Ok(sp) = r.json::<StudentProfile>().await {
                enriched.push(AttendanceRecordWithStudent {
                    id: record.id, student_id: record.student_id, session_id: record.session_id,
                    status: record.status, student_name: format!("{} {}", sp.first_name, sp.last_name.unwrap_or_default()), nfc_id: sp.nfc_id,
                });
            }
        }
    }
    Ok((StatusCode::OK, Json(enriched)))
}

/// PATCH /record/update — B-06: validates status before update
pub async fn mark_attendance_handler(
    State(state): State<AppState>,
    _: ClaimsExtractor,
    Json(payload): Json<UpdateRecordRequest>,
) -> Result<(StatusCode, Json<AttendanceRecord>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    validate_status(&payload.status)?;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?nfc_id={}", payload.nfc_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK {
        return Err((StatusCode::NOT_FOUND, Json(ErrorResponse { message: "student not found".into() })));
    }
    let sp = r.json::<StudentProfile>().await.map_err(internal_error)?;
    let record = diesel::update(attendance_record::table)
        .filter(attendance_record::session_id.eq(payload.session_id).and(attendance_record::student_id.eq(sp.id)))
        .set(attendance_record::status.eq(&payload.status))
        .get_result::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(record)))
}

/// PATCH /record/batch-update — atomic batch update with per-item result reporting
pub async fn batch_update_attendance_handler(
    State(state): State<AppState>,
    _: ClaimsExtractor,
    Json(payload): Json<BatchUpdateRequest>,
) -> Result<(StatusCode, Json<BatchUpdateResponse>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use diesel_async::AsyncConnection;
    use diesel_async::scoped_futures::ScopedFutureExt;
    use diesel::OptionalExtension;

    // Phase 1 ── status validation + HTTP student-profile lookup (no DB yet) ─
    // Business-logic failures (invalid status, unknown nfc_id) are classified
    // here so they never enter the transaction.

    struct Candidate {
        nfc_id: String,
        new_status: String,
        student_id: Uuid,
        student_name: String,
        profile_nfc_id: String,
    }

    let mut early_results: Vec<BatchUpdateResult> = Vec::new();
    let mut candidates: Vec<Candidate> = Vec::new();

    for item in &payload.updates {
        if validate_status(&item.status).is_err() {
            early_results.push(BatchUpdateResult {
                nfc_id: item.nfc_id.clone(),
                result: "failed".into(),
                reason: Some(format!(
                    "invalid status '{}'; must be one of: present, absent, late, excused",
                    item.status
                )),
                record: None,
            });
            continue;
        }

        let resp = state
            .client
            .request(Method::GET, format!("http://127.0.0.1:3000/student/profile?nfc_id={}", item.nfc_id))
            .send()
            .await
            .map_err(internal_error)?;

        if !resp.status().is_success() {
            early_results.push(BatchUpdateResult {
                nfc_id: item.nfc_id.clone(),
                result: "failed".into(),
                reason: Some("nfc_id not recognised".into()),
                record: None,
            });
            continue;
        }

        match resp.json::<StudentProfile>().await {
            Ok(sp) => candidates.push(Candidate {
                nfc_id: item.nfc_id.clone(),
                new_status: item.status.clone(),
                student_id: sp.id,
                student_name: format!("{} {}", sp.first_name, sp.last_name.unwrap_or_default()),
                profile_nfc_id: sp.nfc_id,
            }),
            Err(_) => early_results.push(BatchUpdateResult {
                nfc_id: item.nfc_id.clone(),
                result: "failed".into(),
                reason: Some("failed to parse student profile".into()),
                record: None,
            }),
        }
    }

    // Phase 2 ── single DB transaction for all resolved candidates ────────────
    //
    // "not found in session" and "already same status" are classified inside the
    // transaction but pushed to `out` — they do NOT abort it. Only real diesel
    // errors propagate via `?` and trigger a rollback of all updates in this batch.

    let session_id = payload.session_id;

    // Flatten into owned tuples so the async closure is 'static.
    let candidate_rows: Vec<(String, String, Uuid, String, String)> = candidates
        .into_iter()
        .map(|c| (c.nfc_id, c.new_status, c.student_id, c.student_name, c.profile_nfc_id))
        .collect();

    let mut conn = state.pool.get().await.map_err(internal_error)?;

    let tx_results: Vec<BatchUpdateResult> = if candidate_rows.is_empty() {
        Vec::new()
    } else {
        conn.transaction::<Vec<BatchUpdateResult>, diesel::result::Error, _>(|conn| {
            async move {
                let mut out: Vec<BatchUpdateResult> = Vec::new();
                for (nfc_id, new_status, student_id, student_name, profile_nfc_id) in candidate_rows {
                    let existing: Option<AttendanceRecord> = attendance_record::table
                        .filter(
                            attendance_record::session_id
                                .eq(session_id)
                                .and(attendance_record::student_id.eq(student_id)),
                        )
                        .get_result::<AttendanceRecord>(conn)
                        .await
                        .optional()?; // Ok(None) on NotFound; propagates real DB errors

                    match existing {
                        None => out.push(BatchUpdateResult {
                            nfc_id,
                            result: "failed".into(),
                            reason: Some("nfc_id not found in session".into()),
                            record: None,
                        }),
                        Some(rec) if rec.status == new_status => out.push(BatchUpdateResult {
                            nfc_id,
                            result: "skipped".into(),
                            reason: None,
                            record: Some(AttendanceRecordWithStudent {
                                id: rec.id,
                                student_id: rec.student_id,
                                session_id: rec.session_id,
                                status: rec.status,
                                student_name,
                                nfc_id: profile_nfc_id,
                            }),
                        }),
                        Some(_) => {
                            let updated = diesel::update(attendance_record::table)
                                .filter(
                                    attendance_record::session_id
                                        .eq(session_id)
                                        .and(attendance_record::student_id.eq(student_id)),
                                )
                                .set(attendance_record::status.eq(&new_status))
                                .get_result::<AttendanceRecord>(conn)
                                .await?; // propagates DB error → rolls back entire transaction
                            out.push(BatchUpdateResult {
                                nfc_id,
                                result: "success".into(),
                                reason: None,
                                record: Some(AttendanceRecordWithStudent {
                                    id: updated.id,
                                    student_id: updated.student_id,
                                    session_id: updated.session_id,
                                    status: updated.status,
                                    student_name,
                                    nfc_id: profile_nfc_id,
                                }),
                            });
                        }
                    }
                }
                Ok(out)
            }
            .scope_boxed()
        })
        .await
        .map_err(internal_error)?
    };

    // Phase 3 ── merge early failures with transaction outcomes ───────────────
    let mut all_results = early_results;
    all_results.extend(tx_results);

    let processed = all_results.iter().filter(|r| r.result == "success").count();
    let skipped   = all_results.iter().filter(|r| r.result == "skipped").count();
    let failed    = all_results.iter().filter(|r| r.result == "failed").count();

    let status_code = if processed > 0 || skipped > 0 {
        StatusCode::OK
    } else {
        StatusCode::BAD_REQUEST
    };

    Ok((status_code, Json(BatchUpdateResponse { processed, skipped, failed, results: all_results })))
}

/// POST /record/offline-sync — B-11: idempotent batch NFC replay
pub async fn offline_sync_handler(
    State(state): State<AppState>,
    _: ClaimsExtractor,
    Json(payload): Json<OfflineSyncRequest>,
) -> Result<(StatusCode, Json<OfflineSyncResponse>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let mut processed = 0usize; let mut skipped = 0usize; let mut failed = 0usize;
    let mut details: Vec<OfflineSyncDetail> = Vec::new();

    for rec in &payload.records {
        // Check deduplication by client_id
        let existing: i64 = attendance_record::table
            .filter(attendance_record::client_id.eq(rec.client_id))
            .count()
            .get_result(&mut conn).await.unwrap_or(0);
        if existing > 0 {
            skipped += 1;
            details.push(OfflineSyncDetail { client_id: rec.client_id, result: "skipped".into(), reason: Some("already synced".into()) });
            continue;
        }
        if validate_status(&rec.status).is_err() {
            failed += 1;
            details.push(OfflineSyncDetail { client_id: rec.client_id, result: "failed".into(), reason: Some(format!("invalid status '{}'", rec.status)) });
            continue;
        }
        let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?nfc_id={}", rec.nfc_id)).send().await.map_err(internal_error)?;
        if r.status() != StatusCode::OK {
            failed += 1;
            details.push(OfflineSyncDetail { client_id: rec.client_id, result: "failed".into(), reason: Some("student not found".into()) });
            continue;
        }
        let sp = match r.json::<StudentProfile>().await { Ok(s) => s, Err(_) => { failed += 1; details.push(OfflineSyncDetail { client_id: rec.client_id, result: "failed".into(), reason: Some("parse error".into()) }); continue; } };
        let update_result = diesel::update(attendance_record::table)
            .filter(attendance_record::session_id.eq(rec.session_id).and(attendance_record::student_id.eq(sp.id)))
            .set((attendance_record::status.eq(&rec.status), attendance_record::client_id.eq(Some(rec.client_id))))
            .execute(&mut conn).await;
        match update_result {
            Ok(_) => { processed += 1; details.push(OfflineSyncDetail { client_id: rec.client_id, result: "success".into(), reason: None }); }
            Err(e) => { failed += 1; details.push(OfflineSyncDetail { client_id: rec.client_id, result: "failed".into(), reason: Some(e.to_string()) }); }
        }
    }
    Ok((StatusCode::OK, Json(OfflineSyncResponse { processed, skipped, failed, details })))
}

pub async fn get_student_permissions(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<crate::models::Permission>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let perms = crate::schema::permissions::table
        .filter(crate::schema::permissions::student_id.eq(Uuid::parse_str(&user_id).unwrap()))
        .load::<crate::models::Permission>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(perms)))
}

pub async fn create_permission_handler(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<crate::models::Permission>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use chrono::Utc;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let mut session_id = None; let mut description = None; let mut img_url = None;
    while let Some(field) = multipart.next_field().await.map_err(internal_error)? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "session_id" { let d = field.text().await.map_err(internal_error)?; session_id = Some(Uuid::parse_str(&d).map_err(internal_error)?); }
        else if name == "description" { description = Some(field.text().await.map_err(internal_error)?); }
        else if name == "file" {
            let filename = field.file_name().unwrap_or("upload.tmp").to_string();
            let data = field.bytes().await.map_err(internal_error)?;
            let ext = std::path::Path::new(&filename).extension().and_then(|e| e.to_str()).unwrap_or("bin");
            let new_filename = format!("{}.{}", Uuid::now_v7(), ext);
            let target = format!("uploads/{}", new_filename);
            tokio::fs::write(&target, &data).await.map_err(internal_error)?;
            img_url = Some(target);
        }
    }
    let session_id_uuid = session_id.ok_or_else(|| (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "session_id is required".into() })))?;
    let desc = description.ok_or_else(|| (StatusCode::BAD_REQUEST, Json(ErrorResponse { message: "description is required".into() })))?;
    let new_perm = crate::models::Permission {
        id: Uuid::now_v7(), session_id: session_id_uuid,
        student_id: Uuid::parse_str(&user_id).unwrap(),
        description: desc, img_url, status: "pending".into(), created_at: Utc::now(),
    };
    diesel::insert_into(crate::schema::permissions::table).values(&new_perm).execute(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::CREATED, Json(new_perm)))
}

pub async fn get_student_sessions(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<Vec<crate::models::Session>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let records = attendance_record::table.filter(attendance_record::student_id.eq(Uuid::parse_str(&user_id).unwrap())).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
    let ids: Vec<Uuid> = records.iter().map(|r| r.session_id).collect();
    let sess = sessions::table.filter(sessions::id.eq_any(ids)).load::<crate::models::Session>(&mut conn).await.map_err(internal_error)?;
    Ok((StatusCode::OK, Json(sess)))
}

pub async fn get_student_dashboard_metrics_handler(
    State(state): State<AppState>,
    ClaimsExtractor { user_id, .. }: ClaimsExtractor,
) -> Result<(StatusCode, Json<crate::models::StudentDashboardMetrics>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let records = attendance_record::table.filter(attendance_record::student_id.eq(Uuid::parse_str(&user_id).unwrap())).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
    let total = records.len() as f64;
    let present = records.iter().filter(|r| r.status == "present").count() as f64;
    let overall = if total > 0.0 { (present / total) * 100.0 } else { 0.0 };
    let trend = records.iter().map(|r| crate::models::AttendanceTrend { date: "2026-05-01".into(), status: r.status.clone() }).collect();
    Ok((StatusCode::OK, Json(crate::models::StudentDashboardMetrics {
        overall_attendance: overall,
        courses_performance: vec![crate::models::CoursePerformance { course_name: "Enrolled Courses".into(), percentage: overall }],
        attendance_trend: trend,
    })))
}
