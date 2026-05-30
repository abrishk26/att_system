use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

// ── DB Models ─────────────────────────────────────────────────────────────────

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::notifications)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub is_read: bool,
    pub action_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::notifications)]
pub struct NewNotification {
    pub user_id: Uuid,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub action_url: Option<String>,
}


#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::permissions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Permission {
    pub id: Uuid,
    pub session_id: Uuid,
    pub student_id: Uuid,
    pub description: String,
    pub img_url: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::sessions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Session {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub class_id: Uuid,
    pub course_id: Uuid,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::attendance_record)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub student_id: Uuid,
    pub session_id: Uuid,
    pub status: String,
    pub client_id: Option<Uuid>,
}

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::token_denylist)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct TokenDenylist {
    pub jti: String,
    pub revoked_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::tap_log)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct TapLog {
    pub id: Uuid,
    pub nfc_id: String,
    pub session_id: Uuid,
    pub student_id: Option<Uuid>,
    pub success: bool,
    pub reason: Option<String>,
    pub tapped_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TapLogResponse {
    pub id: Uuid,
    pub nfc_id: String,
    pub session_id: Uuid,
    pub student_id: Option<Uuid>,
    pub student_name: Option<String>,
    pub success: bool,
    pub reason: Option<String>,
    pub tapped_at: DateTime<Utc>,
}

// ── Department Analytics types ───────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DepartmentAnalytics {
    pub total_students: usize,
    pub total_sessions: usize,
    pub total_instructors: usize,
    pub avg_attendance_rate: f64,
    pub attendance_by_day: Vec<DayAttendance>,
    pub top_courses: Vec<CourseAttendanceStat>,
    pub bottom_courses: Vec<CourseAttendanceStat>,
    pub instructor_breakdown: Vec<InstructorBreakdown>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DayAttendance {
    pub day: String,
    pub rate: f64,
    pub sessions: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CourseAttendanceStat {
    pub course_id: Uuid,
    pub course_name: Option<String>,
    pub attendance_rate: f64,
    pub session_count: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InstructorBreakdown {
    pub instructor_id: Uuid,
    pub instructor_name: Option<String>,
    pub sessions: usize,
    pub avg_attendance: f64,
}

// ── Enriched response types ───────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AttendanceRecordWithStudent {
    pub id: Uuid,
    pub student_id: Uuid,
    pub session_id: Uuid,
    pub status: String,
    pub student_name: String,
    pub nfc_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PermissionWithStudent {
    pub id: Uuid,
    pub session_id: Uuid,
    pub student_id: Uuid,
    pub student_name: String,
    pub description: String,
    pub img_url: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

// ── Request structs ───────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateSessionRequest {
    pub instructor_id: Uuid,
    pub class_id: Uuid,
    pub course_id: Uuid,
}

#[derive(Deserialize)]
pub struct UpdateSessionRequest {
    pub session_id: Uuid,
    pub status: String,
}

#[derive(Deserialize)]
pub struct CreateRecordRequest {
    pub session_id: Uuid,
}

#[derive(Deserialize)]
pub struct UpdateRecordRequest {
    pub nfc_id: String,
    pub session_id: Uuid,
    pub status: String,
}

#[derive(Deserialize)]
pub struct BatchUpdateItem {
    pub nfc_id: String,
    pub status: String,
}

#[derive(Deserialize)]
pub struct BatchUpdateRequest {
    pub session_id: Uuid,
    pub updates: Vec<BatchUpdateItem>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BatchUpdateResult {
    pub nfc_id: String,
    pub result: String,
    pub reason: Option<String>,
    pub record: Option<AttendanceRecordWithStudent>,
}

#[derive(Serialize)]
pub struct BatchUpdateResponse {
    pub processed: usize,
    pub skipped: usize,
    pub failed: usize,
    pub results: Vec<BatchUpdateResult>,
}

#[derive(Deserialize)]
pub struct OfflineSyncRecord {
    pub client_id: Uuid,
    pub nfc_id: String,
    pub session_id: Uuid,
    pub status: String,
    pub client_timestamp: Option<String>,
}

#[derive(Deserialize)]
pub struct OfflineSyncRequest {
    pub records: Vec<OfflineSyncRecord>,
}

#[derive(Serialize)]
pub struct OfflineSyncDetail {
    pub client_id: Uuid,
    pub result: String,
    pub reason: Option<String>,
}

#[derive(Serialize)]
pub struct OfflineSyncResponse {
    pub processed: usize,
    pub skipped: usize,
    pub failed: usize,
    pub details: Vec<OfflineSyncDetail>,
}

#[derive(Deserialize)]
pub struct UpdatePermissionStatusRequest {
    pub status: String,
}

#[derive(Deserialize)]
pub struct LogoutRequest {
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct NfcLoginRequest {
    pub nfc_id: String,
}

// ── Cross-service DTOs (from data_source) ─────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Course {
    pub id: Uuid,
    pub course_id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Class {
    pub id: Uuid,
    pub year: i32,
    pub section: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Assignment {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub class_id: Uuid,
    pub course_id: Uuid,
    pub day: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub room: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EnrichedAssignment {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub class_id: Uuid,
    pub course_id: Uuid,
    pub course_name: String,
    pub course_code: String,
    pub class_year: i32,
    pub class_section: i32,
    pub day: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub room: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScheduleItem {
    pub course_id: Uuid,
    pub class_id: Uuid,
    pub course_name: String,
    pub class_year: String,
    pub class_section: String,
    pub day_of_week: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub room: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub first_name: String,
    pub last_name: Option<String>,
    pub role: String,
    pub img_url: Option<String>,
    pub nfc_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PermissionWithStudentMinimal {
    pub id: Uuid,
    pub img_url: Option<String>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StudentProfile {
    pub id: Uuid,
    pub nfc_id: String,
    pub first_name: String,
    pub last_name: Option<String>,
    pub username: String,
    pub img_url: Option<String>,
    pub role: String,
    pub attendance_percentage: Option<f64>,
}

// ── Dashboard types ───────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CoursePerformance {
    pub course_name: String,
    pub percentage: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AttendanceTrend {
    pub date: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StudentDashboardMetrics {
    pub overall_attendance: f64,
    pub courses_performance: Vec<CoursePerformance>,
    pub attendance_trend: Vec<AttendanceTrend>,
}

// ── Permissions filter query params ──────────────────────────────────────────

#[derive(Deserialize, Default)]
pub struct PermissionsQueryParams {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize, Default)]
pub struct SessionsQueryParams {
    pub course_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub date: Option<String>, // ISO 8601 date string e.g., "2025-10-24"
}
