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
    anomalies, apply_time_filter, batch_section_course_rows, batch_section_rows, build_kpi,
    by_day_of_week, by_hour, cohort_by_class_year, course_rows, daily_timeline,
    filter_snapshot_by_cohort, instructor_rows, section_rows, session_heatmap,
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

/// Optional cohort scope: limit metrics to sessions in matching batch year / section.
pub type CohortScope = (Option<i32>, Option<i32>);

pub async fn university_intelligence(
    state: &AppState,
    q: &AnalyticsQuery,
    cohort: Option<CohortScope>,
) -> Result<UniversityIntelligence, (StatusCode, Json<ErrorResponse>)> {
    let (from, to) = parse_range(q)?;
    let raw = load_snapshot(state).await?;
    let mut f = apply_time_filter(raw, from, to);

    let mut cache = EnrichCache::new();

    let mut class_meta_map: std::collections::HashMap<uuid::Uuid, (i32, i32)> =
        std::collections::HashMap::new();
    for s in &f.sessions {
        if class_meta_map.contains_key(&s.class_id) {
            continue;
        }
        if let Ok(Some(cl)) = cache.ensure_class(state, s.class_id).await {
            class_meta_map.insert(s.class_id, (cl.year, cl.section));
        }
    }

    if let Some((filter_year, filter_section)) = cohort {
        if filter_year.is_some() || filter_section.is_some() {
            let meta = &class_meta_map;
            f = filter_snapshot_by_cohort(f, |cid| meta.get(&cid).copied(), filter_year, filter_section);
        }
    }

    let sessions = &f.sessions;
    let records = &f.records;
    let taps = &f.taps;

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

    let class_meta = |cid: uuid::Uuid| class_meta_map.get(&cid).copied();
    let cohort = cohort_by_class_year(sessions, records, |cid| class_meta(cid).map(|(y, _)| y));

    let batch_course_raw = batch_section_course_rows(sessions, records, class_meta);
    let mut batch_section_courses = Vec::new();
    for (y, sec, cid, sf, rec_n, att, punct) in &batch_course_raw {
        let (code, name) = cache.course_row(state, *cid).await?;
        batch_section_courses.push(dto::BatchSectionCourseRow {
            class_year: *y,
            section: *sec,
            course_id: *cid,
            course_code: code,
            course_name: name,
            sessions_finished: *sf,
            records: *rec_n,
            attendance_rate: *att,
            punctuality_index: *punct,
        });
    }

    let mut batch_sections = Vec::new();
    for (y, sec, sf, rec_n, cc, att, punct) in batch_section_rows(sessions, records, class_meta) {
        batch_sections.push(dto::BatchSectionRow {
            class_year: y,
            section: sec,
            sessions_finished: sf,
            records: rec_n,
            course_count: cc,
            attendance_rate: att,
            punctuality_index: punct,
        });
    }

    let mut courses_by_batch = Vec::new();
    for row in &batch_section_courses {
        courses_by_batch.push(dto::CourseByBatchRow {
            course_id: row.course_id,
            course_code: row.course_code.clone(),
            course_name: row.course_name.clone(),
            class_year: row.class_year,
            section: row.section,
            sessions_finished: row.sessions_finished,
            attendance_rate: row.attendance_rate,
        });
    }

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
        batch_sections,
        batch_section_courses,
        courses_by_batch,
    })
}

fn batch_matches_filter(
    class_year: i32,
    section: i32,
    filter_year: Option<i32>,
    filter_section: Option<i32>,
) -> bool {
    if let Some(y) = filter_year {
        if class_year != y {
            return false;
        }
    }
    if let Some(s) = filter_section {
        if section != s {
            return false;
        }
    }
    true
}

fn push_batch_report_tables(
    tables: &mut Vec<dto::ReportTable>,
    intel: &UniversityIntelligence,
    filter_year: Option<i32>,
    filter_section: Option<i32>,
) {
    let section_rows: Vec<_> = intel
        .batch_sections
        .iter()
        .filter(|r| batch_matches_filter(r.class_year, r.section, filter_year, filter_section))
        .collect();

    tables.push(dto::ReportTable {
        title: "Batch year & section summary".into(),
        columns: vec![
            "Batch year".into(),
            "Section".into(),
            "Courses".into(),
            "Finished sessions".into(),
            "Attendance marks".into(),
            "Attendance %".into(),
            "Punctuality %".into(),
        ],
        rows: section_rows
            .iter()
            .map(|r| {
                vec![
                    r.class_year.to_string(),
                    r.section.to_string(),
                    r.course_count.to_string(),
                    r.sessions_finished.to_string(),
                    r.records.to_string(),
                    format!("{:.1}", r.attendance_rate),
                    format!("{:.1}", r.punctuality_index),
                ]
            })
            .collect(),
    });

    let course_rows: Vec<_> = intel
        .batch_section_courses
        .iter()
        .filter(|r| batch_matches_filter(r.class_year, r.section, filter_year, filter_section))
        .take(120)
        .collect();

    tables.push(dto::ReportTable {
        title: "Courses within each batch & section".into(),
        columns: vec![
            "Batch year".into(),
            "Section".into(),
            "Course".into(),
            "Code".into(),
            "Sessions".into(),
            "Attendance %".into(),
            "Punctuality %".into(),
        ],
        rows: course_rows
            .iter()
            .map(|r| {
                vec![
                    r.class_year.to_string(),
                    r.section.to_string(),
                    r.course_name.clone().unwrap_or_else(|| "Unknown".into()),
                    r.course_code.clone().unwrap_or_default(),
                    r.sessions_finished.to_string(),
                    format!("{:.1}", r.attendance_rate),
                    format!("{:.1}", r.punctuality_index),
                ]
            })
            .collect(),
    });

    if filter_year.is_none() && filter_section.is_none() {
        let cohort_rows: Vec<Vec<String>> = intel
            .cohort_by_class_year
            .iter()
            .map(|c| {
                vec![
                    c.label.clone(),
                    format!("{:.1}", c.attendance_rate),
                    c.count.to_string(),
                ]
            })
            .collect();
        tables.push(dto::ReportTable {
            title: "All batch years compared".into(),
            columns: vec![
                "Batch year".into(),
                "Attendance %".into(),
                "Attendance marks".into(),
            ],
            rows: cohort_rows,
        });
    }
}

pub async fn build_report_document(
    state: &AppState,
    req: &ReportBuildRequest,
) -> Result<ReportDocument, (StatusCode, Json<ErrorResponse>)> {
    let q = AnalyticsQuery {
        from: req.from.clone(),
        to: req.to.clone(),
    };
    let cohort = if req.class_year.is_some() || req.section.is_some() {
        Some((req.class_year, req.section))
    } else {
        None
    };
    let intel = university_intelligence(state, &q, cohort).await?;
    let title = match req.report_type.as_str() {
        "student_attendance" => "Student attendance intelligence",
        "instructor" => "Instructor performance report",
        "course" => "Course attendance report",
        "departmental" => "Cohort & section attendance report",
        "batch_cohort" => "Batch year, section & course performance report",
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

    let filter_note = match (req.class_year, req.section) {
        (Some(y), Some(s)) => format!(" Filtered to batch year {} section {}.", y, s),
        (Some(y), None) => format!(" Filtered to batch year {}.", y),
        (None, Some(s)) => format!(" Filtered to section {} across years.", s),
        _ => String::new(),
    };

    let summary = format!(
        "Across {} finished sessions, institution-wide attendance is {:.1}% with {:.1}% punctuality (present vs present+late). {} students appear in attendance data; {} anomalies flagged for review.{}",
        intel.kpi.finished_sessions,
        intel.kpi.overall_attendance_rate,
        intel.kpi.punctuality_index,
        intel.kpi.unique_students,
        intel.anomalies.len(),
        filter_note
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

    if req.report_type == "student_attendance" || req.report_type == "audit" {
        let excellent = intel
            .students_at_risk
            .iter()
            .filter(|s| s.attendance_rate >= 85.0)
            .count();
        let warning = intel
            .students_at_risk
            .iter()
            .filter(|s| s.attendance_rate >= 70.0 && s.attendance_rate < 85.0)
            .count();
        let critical = intel
            .students_at_risk
            .iter()
            .filter(|s| s.attendance_rate < 70.0)
            .count();
        kpis.push(ReportKpiBlock {
            title: "Learner attendance brackets".into(),
            items: vec![
                ("Excellent (≥85%)".into(), excellent.to_string()),
                ("Warning (70–84%)".into(), warning.to_string()),
                ("Critical (<70%)".into(), critical.to_string()),
                (
                    "Learners tracked".into(),
                    intel.students_at_risk.len().to_string(),
                ),
            ],
        });

        let status_rows: Vec<Vec<String>> = intel
            .status_distribution
            .iter()
            .map(|s| {
                vec![
                    s.status.clone(),
                    s.count.to_string(),
                    format!("{:.1}", s.pct),
                ]
            })
            .collect();
        tables.push(ReportTable {
            title: "Attendance status distribution".into(),
            columns: vec!["Status".into(), "Count".into(), "% of marks".into()],
            rows: status_rows,
        });

        let high_risk: Vec<Vec<String>> = intel
            .students_at_risk
            .iter()
            .filter(|s| s.predicted_low || s.risk_score >= 55.0)
            .take(40)
            .map(|s| {
                vec![
                    s.student_name.clone().unwrap_or_else(|| "Unknown".into()),
                    format!("{:.1}", s.attendance_rate),
                    format!("{:.1}", s.risk_score),
                    s.max_absence_streak.to_string(),
                    if s.predicted_low {
                        "Yes".into()
                    } else {
                        "Monitor".into()
                    },
                ]
            })
            .collect();
        tables.push(ReportTable {
            title: "Priority intervention list".into(),
            columns: vec![
                "Student".into(),
                "Attendance %".into(),
                "Risk score".into(),
                "Max absence streak".into(),
                "Advise".into(),
            ],
            rows: high_risk,
        });
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

    if matches!(
        req.report_type.as_str(),
        "departmental" | "batch_cohort" | "semester" | "comparative"
    ) {
        push_batch_report_tables(&mut tables, &intel, req.class_year, req.section);
    }

    if req.report_type == "compliance" || req.report_type == "audit" {
        kpis.push(ReportKpiBlock {
            title: "Compliance proxies".into(),
            items: vec![
                ("Absent %".into(), format!("{:.1}", intel.kpi.absent_rate)),
                ("Late %".into(), format!("{:.1}", intel.kpi.late_rate)),
                ("Excused %".into(), format!("{:.1}", intel.kpi.excused_rate)),
                ("Duplicate NFC taps".into(), intel.tap_audit.duplicate_taps.to_string()),
                ("Unknown card taps".into(), intel.tap_audit.unknown_card_taps.to_string()),
                (
                    "NFC tap success %".into(),
                    format!("{:.1}", intel.tap_audit.success_rate),
                ),
            ],
        });
    }

    if req.report_type == "audit" {
        tables.push(ReportTable {
            title: "Session coverage audit".into(),
            columns: vec!["Metric".into(), "Value".into()],
            rows: vec![
                vec![
                    "Finished sessions in range".into(),
                    intel.kpi.finished_sessions.to_string(),
                ],
                vec![
                    "Record completeness %".into(),
                    format!("{:.1}", intel.kpi.record_completeness),
                ],
                vec![
                    "Unique students with marks".into(),
                    intel.kpi.unique_students.to_string(),
                ],
                vec![
                    "Anomalies flagged".into(),
                    intel.anomalies.len().to_string(),
                ],
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
