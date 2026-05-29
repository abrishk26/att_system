mod compute;
mod dto;
mod enrich;
mod snapshot;

pub use dto::*;

use axum::http::StatusCode;
use axum::Json;
use chrono::{DateTime, Datelike};
use uuid::Uuid;

use crate::types::{AppState, ErrorResponse};

use compute::{
    anomalies, apply_time_filter, build_kpi, by_day_of_week, by_hour, cohort_by_class_year,
    course_rows, daily_timeline, instructor_rows, section_rows, session_heatmap,
    status_distribution as status_dist_fn, student_risk_rows, tap_audit,
};
use enrich::EnrichCache;
use snapshot::load_snapshot;

fn parse_range(
    q: &AnalyticsQuery,
) -> Result<(Option<DateTime<chrono::Utc>>, Option<DateTime<chrono::Utc>>), (StatusCode, Json<ErrorResponse>)> {
    let from = if let Some(ref s) = q.from {
        Some(
            DateTime::parse_from_rfc3339(s)
                .map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        Json(ErrorResponse {
                            message: "invalid `from` datetime; use RFC3339".into(),
                        }),
                    )
                })?
                .with_timezone(&chrono::Utc),
        )
    } else {
        None
    };
    let to = if let Some(ref s) = q.to {
        Some(
            DateTime::parse_from_rfc3339(s)
                .map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        Json(ErrorResponse {
                            message: "invalid `to` datetime; use RFC3339".into(),
                        }),
                    )
                })?
                .with_timezone(&chrono::Utc),
        )
    } else {
        None
    };
    Ok((from, to))
}

pub async fn university_intelligence(
    state: &AppState,
    q: &AnalyticsQuery,
) -> Result<UniversityIntelligence, (StatusCode, Json<ErrorResponse>)> {
    let (from, to) = parse_range(q)?;
    let raw = load_snapshot(state).await?;
    let f = apply_time_filter(raw, from, to);
    let sessions = &f.sessions;
    let records = &f.records;
    let taps = &f.taps;

    let mut cache = EnrichCache::new();

    let kpi = build_kpi(sessions, records);
    let status_distribution = status_dist_fn(records);
    let by_day_of_week = by_day_of_week(sessions, records);
    let by_hour_local = by_hour(sessions, records);
    let daily_timeline = daily_timeline(sessions, records);
    let hm = session_heatmap(sessions, records);
    let tap_audit = tap_audit(taps);

    let mut course_intel = Vec::new();
    for (cid, sf, n, att, punct, decline) in course_rows(sessions, records) {
        let (code, name) = cache.course_row(state, cid).await?;
        course_intel.push(dto::CourseIntelRow {
            course_id: cid,
            course_code: code,
            course_name: name,
            sessions_finished: sf,
            records: n,
            attendance_rate: att,
            punctuality_index: punct,
            decline_score: decline,
        });
    }

    let mut sections = Vec::new();
    for (cid, clid, sf, att, score) in section_rows(sessions, records) {
        let cn = cache.course_name(state, cid).await?;
        let cl = cache.class_label(state, clid).await?;
        sections.push(dto::SectionIntelRow {
            course_id: cid,
            class_id: clid,
            course_name: cn,
            class_label: cl,
            sessions_finished: sf,
            attendance_rate: att,
            section_engagement_score: score,
        });
    }

    let mut instructors = Vec::new();
    for (iid, st, fin, att, punct, comp) in instructor_rows(sessions, records) {
        let name = cache.user_display_name(state, iid).await?;
        instructors.push(dto::InstructorIntelRow {
            instructor_id: iid,
            instructor_name: name,
            sessions_total: st,
            sessions_finished: fin,
            attendance_rate: att,
            punctuality_index: punct,
            completion_proxy: comp,
        });
    }

    let mut students_at_risk = student_risk_rows(sessions, records, 200);
    for row in &mut students_at_risk {
        row.student_name = cache.user_display_name(state, row.student_id).await?;
    }

    let mut anoms = anomalies(sessions, records, taps);
    for a in &mut anoms {
        if let Some(sid) = a.session_id {
            if let Some(sess) = sessions.iter().find(|s| s.id == sid) {
                a.course_name = cache.course_name(state, sess.course_id).await?;
                a.instructor_name = cache
                    .user_display_name(state, sess.instructor_id)
                    .await?;
            }
        }
    }

    let mut class_years = std::collections::HashMap::new();
    for s in sessions {
        if !class_years.contains_key(&s.class_id) {
            if let Ok(Some(y)) = cache.class_year(state, s.class_id).await {
                class_years.insert(s.class_id, y);
            }
        }
    }
    let cohort = cohort_by_class_year(sessions, records, |cid| class_years.get(&cid).copied());

    Ok(UniversityIntelligence {
        meta: AnalyticsMeta {
            generated_at: chrono::Utc::now(),
            from,
            to,
        },
        kpi,
        status_distribution,
        by_day_of_week,
        by_hour_local,
        daily_timeline,
        courses: course_intel,
        sections,
        instructors,
        students_at_risk,
        anomalies: anoms,
        session_heatmap: hm,
        tap_audit,
        cohort_by_class_year: cohort,
    })
}

pub async fn build_report_document(
    state: &AppState,
    req: &ReportBuildRequest,
) -> Result<ReportDocument, (StatusCode, Json<ErrorResponse>)> {
    let q = AnalyticsQuery {
        from: req.from.clone(),
        to: req.to.clone(),
    };
    let intel = university_intelligence(state, &q).await?;
    let title = match req.report_type.as_str() {
        "student_attendance" => "Student attendance intelligence",
        "instructor" => "Instructor performance report",
        "course" => "Course attendance report",
        "departmental" => "Cohort & section attendance report",
        "semester" => "Semester attendance executive brief",
        "compliance" => "Attendance compliance & record coverage",
        "irregularity" => "Irregularity & anomaly digest",
        "audit" => "Attendance audit workbook",
        "comparative" => "Comparative performance report",
        "trend" => "Temporal trend analysis",
        "risk" => "At-risk learner register",
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    message: format!(
                        "unknown report_type '{}'. See documentation for supported values.",
                        req.report_type
                    ),
                }),
            ))
        }
    };

    let mut kpis = vec![ReportKpiBlock {
        title: "Executive KPIs".into(),
        items: vec![
            ("Overall attendance %".into(), format!("{:.1}", intel.kpi.overall_attendance_rate)),
            ("Finished sessions".into(), format!("{}", intel.kpi.finished_sessions)),
            ("Active sessions".into(), format!("{}", intel.kpi.active_sessions)),
            ("Unique students (in range)".into(), format!("{}", intel.kpi.unique_students)),
            ("NFC tap success %".into(), format!("{:.1}", intel.tap_audit.success_rate)),
            ("Session record coverage %".into(), format!("{:.1}", intel.kpi.record_completeness)),
        ],
    }];

    let summary = format!(
        "Across {} finished sessions, institution-wide attendance is {:.1}% with {:.1}% punctuality (present vs present+late). {} students appear in attendance data; {} anomalies flagged for review.",
        intel.kpi.finished_sessions,
        intel.kpi.overall_attendance_rate,
        intel.kpi.punctuality_index,
        intel.kpi.unique_students,
        intel.anomalies.len()
    );

    let mut tables = Vec::new();

    match req.report_type.as_str() {
        "risk" | "student_attendance" | "audit" => {
            let rows: Vec<Vec<String>> = intel
                .students_at_risk
                .iter()
                .take(80)
                .map(|s| {
                    vec![
                        s.student_name.clone().unwrap_or_else(|| "Unknown".into()),
                        s.sessions_count.to_string(),
                        format!("{:.1}", s.attendance_rate),
                        format!("{:.1}", s.punctuality_index),
                        format!("{:.1}", s.risk_score),
                        s.max_absence_streak.to_string(),
                    ]
                })
                .collect();
            tables.push(ReportTable {
                title: "At-risk learners".into(),
                columns: vec![
                    "Student".into(),
                    "Sessions".into(),
                    "Attendance %".into(),
                    "Punctuality %".into(),
                    "Risk".into(),
                    "Max absence streak".into(),
                ],
                rows,
            });
        }
        _ => {}
    }

    if matches!(
        req.report_type.as_str(),
        "instructor" | "comparative" | "semester" | "departmental"
    ) {
        let rows: Vec<Vec<String>> = intel
            .instructors
            .iter()
            .take(60)
            .map(|i| {
                vec![
                    i.instructor_name.clone().unwrap_or_else(|| "Unknown".into()),
                    i.sessions_finished.to_string(),
                    format!("{:.1}", i.attendance_rate),
                    format!("{:.1}", i.punctuality_index),
                    format!("{:.1}", i.completion_proxy),
                ]
            })
            .collect();
        tables.push(ReportTable {
            title: "Instructor metrics".into(),
            columns: vec![
                "Instructor".into(),
                "Finished sessions".into(),
                "Attendance %".into(),
                "Punctuality %".into(),
                "Session completion %".into(),
            ],
            rows,
        });
    }

    if matches!(
        req.report_type.as_str(),
        "course" | "comparative" | "semester" | "departmental" | "trend"
    ) {
        let rows: Vec<Vec<String>> = intel
            .courses
            .iter()
            .take(60)
            .map(|c| {
                vec![
                    c.course_name.clone().unwrap_or_else(|| "Unknown course".into()),
                    c.course_code.clone().unwrap_or_default(),
                    c.sessions_finished.to_string(),
                    format!("{:.1}", c.attendance_rate),
                    format!("{:.1}", c.decline_score),
                ]
            })
            .collect();
        tables.push(ReportTable {
            title: "Course performance".into(),
            columns: vec![
                "Course".into(),
                "Code".into(),
                "Sessions".into(),
                "Attendance %".into(),
                "Chronological decline score".into(),
            ],
            rows,
        });
    }

    if matches!(req.report_type.as_str(), "irregularity" | "compliance" | "audit") {
        let rows: Vec<Vec<String>> = intel
            .anomalies
            .iter()
            .take(100)
            .map(|a| {
                vec![
                    a.kind.clone(),
                    a.severity.clone(),
                    a.message.clone(),
                    a.session_id.map(|u| u.to_string()).unwrap_or_default(),
                    a.course_name.clone().unwrap_or_default(),
                ]
            })
            .collect();
        tables.push(ReportTable {
            title: "Flagged irregularities".into(),
            columns: vec![
                "Type".into(),
                "Severity".into(),
                "Detail".into(),
                "Session id".into(),
                "Course".into(),
            ],
            rows,
        });
    }

    if req.report_type == "compliance" {
        kpis.push(ReportKpiBlock {
            title: "Compliance proxies".into(),
            items: vec![
                ("Absent %".into(), format!("{:.1}", intel.kpi.absent_rate)),
                ("Late %".into(), format!("{:.1}", intel.kpi.late_rate)),
                ("Excused %".into(), format!("{:.1}", intel.kpi.excused_rate)),
                ("Duplicate NFC taps".into(), intel.tap_audit.duplicate_taps.to_string()),
                ("Unknown card taps".into(), intel.tap_audit.unknown_card_taps.to_string()),
            ],
        });
    }

    if req.include_charts {
        // Chart payloads are delivered via the main intelligence API for interactive dashboards;
        // printable PDFs can embed charts client-side from the same metrics.
    }

    Ok(ReportDocument {
        title: title.into(),
        subtitle: "Attendance Intelligence Platform — generated report".into(),
        generated_at: intel.meta.generated_at,
        executive_summary: summary,
        kpis,
        tables,
    })
}

pub async fn student_intel(
    state: &AppState,
    student_id: Uuid,
    q: &AnalyticsQuery,
) -> Result<serde_json::Value, (StatusCode, Json<ErrorResponse>)> {
    let (from, to) = parse_range(q)?;
    let raw = load_snapshot(state).await?;
    let f = apply_time_filter(raw, from, to);
    let sess_map: std::collections::HashMap<Uuid, &crate::models::Session> =
        f.sessions.iter().map(|s| (s.id, s)).collect();
    let mine: Vec<_> = f
        .records
        .iter()
        .filter(|r| r.student_id == student_id)
        .filter(|r| {
            sess_map
                .get(&r.session_id)
                .map(|s| s.status == "finished")
                .unwrap_or(false)
        })
        .collect();
    if mine.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                message: "no finished-session attendance found for this student in range".into(),
            }),
        ));
    }
    let eng = mine.iter().filter(|r| compute::engaged(&r.status)).count();
    let n = mine.len();
    let att = (eng as f64 / n as f64) * 100.0;
    let pres = mine.iter().filter(|r| r.status == "present").count();
    let late = mine.iter().filter(|r| r.status == "late").count();
    let punct = if pres + late > 0 {
        (pres as f64 / (pres + late) as f64) * 100.0
    } else {
        100.0
    };
    let mut by_day = [0usize; 7];
    let mut by_day_tot = [0usize; 7];
    for r in &mine {
        if let Some(s) = sess_map.get(&r.session_id) {
            let idx = s.created_at.weekday().num_days_from_monday() as usize;
            if idx < 7 {
                by_day_tot[idx] += 1;
                if compute::engaged(&r.status) {
                    by_day[idx] += 1;
                }
            }
        }
    }
    let days: Vec<_> = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        .iter()
        .enumerate()
        .map(|(i, label)| {
            serde_json::json!({
                "day": label,
                "rate": if by_day_tot[i] > 0 { (by_day[i] as f64 / by_day_tot[i] as f64) * 100.0 } else { 0.0 },
                "sessions": by_day_tot[i],
            })
        })
        .collect();

    let mut cache = EnrichCache::new();
    let name = cache.user_display_name(state, student_id).await?;

    Ok(serde_json::json!({
        "student_id": student_id,
        "student_name": name,
        "sessions_count": n,
        "attendance_rate": att,
        "punctuality_index": punct,
        "status_breakdown": status_dist_fn(&mine.iter().map(|r| (*r).clone()).collect::<Vec<_>>()),
        "day_of_week": days,
    }))
}
