use axum::{Router, routing::{get, post, patch}};
use crate::handlers::{static_handler, login_handler, refresh_handler, logout_handler, nfc_login_handler, students::*, instructors::*};
use crate::types::AppState;

pub fn new(app_state: AppState) -> Router {
    Router::new()
        // ── Auth ──────────────────────────────────────────────────────────────
        .route("/login", post(login_handler))
        .route("/refresh", post(refresh_handler))
        .route("/logout", post(logout_handler))                        // B-03
        .route("/auth/login/nfc", post(nfc_login_handler))            // B-07

        // ── Profile / Course / Class ──────────────────────────────────────────
        .route("/profile", get(get_profile))
        .route("/course/{course_id}", get(get_course_details))
        .route("/class/{class_id}", get(get_class_details))

        // ── Schedule ─────────────────────────────────────────────────────────
        .route("/schedule", get(get_schedule_handler))                 // B-04

        // ── Instructor assignments ────────────────────────────────────────────
        .route("/instructor/assignments", get(get_instructor_assignments))
        .route("/instructor/assignments/enriched", get(get_enriched_assignments_handler)) // B-08

        // ── Sessions ─────────────────────────────────────────────────────────
        .route("/session/create", post(create_session_handler))
        .route("/session/update", patch(update_session_handler))
        .route("/sessions/instructor", get(get_sessions_by_instructor))
        .route("/student/sessions", get(get_student_sessions))
        .route("/sessions/student", get(get_sessions_by_student))
        .route("/session", get(get_sessions))

        // ── Attendance records ────────────────────────────────────────────────
        .route("/record/create", post(create_record_handler))
        .route("/record/update", patch(mark_attendance_handler))
        .route("/record/batch-update", patch(batch_update_attendance_handler)) // B-05
        .route("/record/offline-sync", post(offline_sync_handler))    // B-11
        .route("/record/{session_id}", get(get_records_with_student_info))

        // ── Permissions ───────────────────────────────────────────────────────
        .route("/instructor/permissions", get(get_all_permissions_handler))       // B-02
        .route("/instructor/permissions/{id}", get(get_permissions_by_session))
        .route("/instructor/permissions/update/{id}", patch(update_permission_handler))
        .route("/student/permissions", get(get_student_permissions))
        .route("/student/permissions", post(create_permission_handler))

        // ── Instructor helpers ────────────────────────────────────────────────
        .route("/instructor/student-count", get(get_student_count_handler))
        .route("/instructor/students", get(get_students_by_course_class_handler))
        .route("/instructor/attendance-stats", get(get_attendance_stats_handler))
        .route("/instructor/dashboard-metrics", get(get_instructor_dashboard_metrics_handler))

        // ── Student helpers ───────────────────────────────────────────────────
        .route("/student/courses", get(get_student_courses))
        .route("/student/dashboard-metrics", get(get_student_dashboard_metrics_handler))

        .fallback(static_handler)
        .with_state(app_state)
}