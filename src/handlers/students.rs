use uuid::Uuid;
use diesel::{BoolExpressionMethods, ExpressionMethods, QueryDsl};
use axum::{extract::{State, Path, Multipart, Query}, http::{StatusCode, Method}, Json};
use crate::types::*;
use crate::schema::{attendance_record, sessions, tap_log};
use crate::helpers::internal_error;
use crate::models::*;
use chrono::Utc;

const VALID_STATUSES: &[&str] = &["present", "absent", "late", "excused"];

fn validate_status(s: &str) -> Result<(), (StatusCode, Json<ErrorResponse>)> {
    if VALID_STATUSES.contains(&s) { Ok(()) } else {
        Err((StatusCode::BAD_REQUEST, Json(ErrorResponse {
            message: format!("Invalid status value '{}'. Must be one of: present, absent, late, excused", s),
        })))
    }
}

/// Inserts a tap_log entry for auditing NFC tap attempts
async fn log_tap(
    conn: &mut diesel_async::AsyncPgConnection,
    nfc_id: &str,
    session_id: Uuid,
    student_id: Option<Uuid>,
    success: bool,
    reason: Option<String>,
) {
    use diesel_async::RunQueryDsl;
    let entry = TapLog {
        id: Uuid::now_v7(),
        nfc_id: nfc_id.to_string(),
        session_id,
        student_id,
        success,
        reason,
        tapped_at: Utc::now(),
    };
    let _ = diesel::insert_into(tap_log::table)
        .values(&entry)
        .execute(conn)
        .await;
}

pub async fn get_sessions_by_student(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
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
    StudentClaims { user_id }: StudentClaims,
) -> Result<(StatusCode, Json<Vec<Course>>), (StatusCode, Json<ErrorResponse>)> {
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/courses/{}", user_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK { return Err((r.status(), Json(ErrorResponse { message: "failed to fetch student courses".into() }))); }
    Ok((StatusCode::OK, Json(r.json::<Vec<Course>>().await.map_err(internal_error)?)))
}

pub async fn get_records_with_student_info(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    _: InstructorClaims,
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

/// PATCH /record/update — B-06: validates status, logs tap, detects duplicates
pub async fn mark_attendance_handler(
    State(state): State<AppState>,
    _: InstructorClaims,
    Json(payload): Json<UpdateRecordRequest>,
) -> Result<(StatusCode, Json<AttendanceRecord>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    validate_status(&payload.status)?;
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // Look up student by NFC ID
    let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?nfc_id={}", payload.nfc_id)).send().await.map_err(internal_error)?;
    if r.status() != StatusCode::OK {
        // Log failed tap (unknown NFC card)
        log_tap(&mut conn, &payload.nfc_id, payload.session_id, None, false, Some("NFC card not recognised".into())).await;
        return Err((StatusCode::NOT_FOUND, Json(ErrorResponse { message: "student not found".into() })));
    }
    let sp = r.json::<StudentProfile>().await.map_err(internal_error)?;

    // Check for duplicate tap (student already marked present in this session)
    let existing = attendance_record::table
        .filter(attendance_record::session_id.eq(payload.session_id).and(attendance_record::student_id.eq(sp.id)))
        .get_result::<AttendanceRecord>(&mut conn)
        .await
        .ok();

    if let Some(ref rec) = existing {
        if rec.status == "present" && payload.status == "present" {
            // Duplicate tap — log it as anomaly, return existing record
            log_tap(&mut conn, &payload.nfc_id, payload.session_id, Some(sp.id), false, Some("duplicate tap — already marked present".into())).await;
            log::warn!("Duplicate tap detected: nfc_id={}, session_id={}", payload.nfc_id, payload.session_id);
            return Ok((StatusCode::OK, Json(rec.clone())));
        }
    }

    // Update attendance status
    let record = diesel::update(attendance_record::table)
        .filter(attendance_record::session_id.eq(payload.session_id).and(attendance_record::student_id.eq(sp.id)))
        .set(attendance_record::status.eq(&payload.status))
        .get_result::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;

    // Log successful tap
    log_tap(&mut conn, &payload.nfc_id, payload.session_id, Some(sp.id), true, None).await;

    Ok((StatusCode::OK, Json(record)))
}

/// PATCH /record/batch-update — B-05, with tap logging
pub async fn batch_update_attendance_handler(
    State(state): State<AppState>,
    _: InstructorClaims,
    Json(payload): Json<BatchUpdateRequest>,
) -> Result<(StatusCode, Json<BatchUpdateResponse>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    use diesel_async::AsyncConnection;
    use diesel_async::scoped_futures::ScopedFutureExt;
    use diesel::OptionalExtension;

    let mut conn = state.pool.get().await.map_err(internal_error)?;

    // Phase 1 ── status validation + HTTP student-profile lookup ─
    struct Candidate {
        nfc_id: String,
        new_status: String,
        student_id: Uuid,
        student_name: String,
        profile_nfc_id: String,
    }

    let mut early_results: Vec<BatchUpdateResult> = Vec::new();
    let mut candidates: Vec<Candidate> = Vec::new();
    let mut conn = state.pool.get().await.map_err(internal_error)?;

    for item in &payload.updates {
        if validate_status(&item.status).is_err() {
            log_tap(&mut conn, &item.nfc_id, payload.session_id, None, false, Some(format!("invalid status '{}'", item.status))).await;
            early_results.push(BatchUpdateResult {
                nfc_id: item.nfc_id.clone(),
                result: "failed".into(),
                reason: Some(format!("invalid status '{}'", item.status)),
                record: None,
            });
            continue;
        }
        let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?nfc_id={}", item.nfc_id)).send().await.map_err(internal_error)?;
        if r.status() != StatusCode::OK {
            log_tap(&mut conn, &item.nfc_id, payload.session_id, None, false, Some("student not found".into())).await;
            early_results.push(BatchUpdateResult {
                nfc_id: item.nfc_id.clone(),
                result: "failed".into(),
                reason: Some("student not found".into()),
                record: None,
            });
            continue;
        }
        
        let sp = match r.json::<StudentProfile>().await { 
            Ok(s) => s, 
            Err(_) => {
                early_results.push(BatchUpdateResult {
                    nfc_id: item.nfc_id.clone(),
                    result: "failed".into(),
                    reason: Some("failed to parse student profile".into()),
                    record: None,
                });
                continue;
            }
        };

        candidates.push(Candidate {
            nfc_id: item.nfc_id.clone(),
            new_status: item.status.clone(),
            student_id: sp.id,
            student_name: format!("{} {}", sp.first_name, sp.last_name.unwrap_or_default()),
            profile_nfc_id: sp.nfc_id,
        });
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
    _: InstructorClaims,
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
    StudentClaims { user_id }: StudentClaims,
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
    StudentClaims { user_id }: StudentClaims,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<crate::models::Permission>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let mut session_id = None; let mut description = None; let mut img_url = None;
    tokio::fs::create_dir_all("uploads").await.map_err(internal_error)?;
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

    // Insert Notification for Instructor
    if let Ok(session) = crate::schema::sessions::table
        .find(session_id_uuid)
        .first::<crate::models::Session>(&mut conn)
        .await
    {
        let notif = crate::models::NewNotification {
            user_id: session.instructor_id,
            title: "New Permission Request".into(),
            message: "A student has submitted a new permission request for your review.".into(),
            notification_type: "permission_update".into(),
            action_url: Some("/instructor/permissions".into()),
        };
        let _ = diesel::insert_into(crate::schema::notifications::table)
            .values(&notif)
            .execute(&mut conn)
            .await;
    }

    Ok((StatusCode::CREATED, Json(new_perm)))
}

pub async fn get_student_sessions(
    State(state): State<AppState>,
    StudentClaims { user_id }: StudentClaims,
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
    StudentClaims { user_id }: StudentClaims,
) -> Result<(StatusCode, Json<crate::models::StudentDashboardMetrics>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let student_uuid = Uuid::parse_str(&user_id).unwrap();
    let records = attendance_record::table.filter(attendance_record::student_id.eq(student_uuid)).load::<AttendanceRecord>(&mut conn).await.map_err(internal_error)?;
    let total = records.len() as f64;
    let present = records.iter().filter(|r| r.status == "present").count() as f64;
    let overall = if total > 0.0 { (present / total) * 100.0 } else { 0.0 };

    // Build per-course performance using session data
    let session_ids: Vec<Uuid> = records.iter().map(|r| r.session_id).collect();
    let student_sessions = sessions::table.filter(sessions::id.eq_any(&session_ids)).load::<Session>(&mut conn).await.map_err(internal_error)?;
    let sessions_map: std::collections::HashMap<Uuid, &Session> = student_sessions.iter().map(|s| (s.id, s)).collect();

    let mut course_stats: std::collections::HashMap<Uuid, (usize, usize)> = std::collections::HashMap::new();
    for rec in &records {
        if let Some(sess) = sessions_map.get(&rec.session_id) {
            let entry = course_stats.entry(sess.course_id).or_insert((0, 0));
            entry.1 += 1; // total
            if rec.status == "present" { entry.0 += 1; } // present
        }
    }

    let mut courses_performance = Vec::new();
    for (course_id, (pres, tot)) in &course_stats {
        let course_name = match state.client.request(Method::GET, format!("http://127.0.0.1:3000/course/{}", course_id)).send().await {
            Ok(r) if r.status() == StatusCode::OK => r.json::<Course>().await.map(|c| c.name).unwrap_or_else(|_| course_id.to_string()),
            _ => course_id.to_string(),
        };
        courses_performance.push(crate::models::CoursePerformance {
            course_name,
            percentage: if *tot > 0 { (*pres as f64 / *tot as f64) * 100.0 } else { 0.0 },
        });
    }

    // Build trend data from recent records
    let trend: Vec<crate::models::AttendanceTrend> = records.iter().rev().take(20).map(|r| {
        let date = sessions_map.get(&r.session_id)
            .map(|s| s.created_at.format("%Y-%m-%d").to_string())
            .unwrap_or_else(|| "unknown".into());
        crate::models::AttendanceTrend { date, status: r.status.clone() }
    }).collect();

    Ok((StatusCode::OK, Json(crate::models::StudentDashboardMetrics {
        overall_attendance: overall,
        courses_performance,
        attendance_trend: trend,
    })))
}

/// GET /tap-log/:session_id — view tap history for a session
pub async fn get_tap_log_handler(
    State(state): State<AppState>,
    Path(session_id): Path<Uuid>,
    _: InstructorClaims,
) -> Result<(StatusCode, Json<Vec<TapLogResponse>>), (StatusCode, Json<ErrorResponse>)> {
    use diesel_async::RunQueryDsl;
    let mut conn = state.pool.get().await.map_err(internal_error)?;
    let logs = tap_log::table
        .filter(tap_log::session_id.eq(session_id))
        .order(tap_log::tapped_at.desc())
        .load::<TapLog>(&mut conn)
        .await
        .map_err(internal_error)?;

    let mut responses = Vec::new();
    for log_entry in logs {
        let student_name = if let Some(sid) = log_entry.student_id {
            let r = state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?id={}", sid)).send().await.ok();
            r.and_then(|resp| {
                if resp.status() == StatusCode::OK {
                    // We need to block on json parsing — use a simpler approach
                    None // Will be filled below
                } else { None }
            })
        } else { None };

        // Simpler approach: try to get student name for enrichment
        let name = if let Some(sid) = log_entry.student_id {
            match state.client.request(Method::GET, format!("http://127.0.0.1:3000/student/profile?id={}", sid)).send().await {
                Ok(resp) if resp.status() == StatusCode::OK => {
                    resp.json::<StudentProfile>().await.ok().map(|sp| format!("{} {}", sp.first_name, sp.last_name.unwrap_or_default()))
                }
                _ => None,
            }
        } else { student_name };

        responses.push(TapLogResponse {
            id: log_entry.id,
            nfc_id: log_entry.nfc_id,
            session_id: log_entry.session_id,
            student_id: log_entry.student_id,
            student_name: name,
            success: log_entry.success,
            reason: log_entry.reason,
            tapped_at: log_entry.tapped_at,
        });
    }

    Ok((StatusCode::OK, Json(responses)))
}
