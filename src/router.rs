use axum::{Router, routing::{get, post, patch}};
use crate::handlers::{static_handler, login_handler, refresh_handler, students::*, instructors::*};
use crate::types::AppState;

pub fn new(app_state: AppState) -> Router {
    Router::new()
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
            .route("/student/permissions", get(get_student_permissions))
            .route("/student/permissions", post(create_permission_handler))
            .route("/session", get(get_sessions))
            .route("/record/{session_id}", get(get_records_with_student_info))
            .fallback(static_handler)
            .with_state(app_state)
}