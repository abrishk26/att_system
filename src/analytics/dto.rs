//! Serializable DTOs for the analytics and reporting API surface.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Debug, Clone)]
pub struct AnalyticsMeta {
    pub generated_at: DateTime<Utc>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
}

#[derive(Deserialize, Debug, Default)]
pub struct AnalyticsQuery {
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct UniversityKpi {
    pub total_sessions: usize,
    pub finished_sessions: usize,
    pub active_sessions: usize,
    pub incoming_sessions: usize,
    pub unique_students: usize,
    pub unique_instructors: usize,
    pub unique_course_offerings: usize,
    pub overall_attendance_rate: f64,
    pub punctuality_index: f64,
    pub excused_rate: f64,
    pub absent_rate: f64,
    pub late_rate: f64,
    pub record_completeness: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct StatusSlice {
    pub status: String,
    pub count: usize,
    pub pct: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct DayBucket {
    pub day: String,
    pub attendance_rate: f64,
    pub punctuality_index: f64,
    pub sessions: usize,
    pub records: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct HourBucket {
    pub hour: u8,
    pub attendance_rate: f64,
    pub sessions: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct DailyPoint {
    pub date: String,
    pub attendance_rate: f64,
    pub sessions: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct CourseIntelRow {
    pub course_id: Uuid,
    pub course_code: Option<String>,
    pub course_name: Option<String>,
    pub sessions_finished: usize,
    pub records: usize,
    pub attendance_rate: f64,
    pub punctuality_index: f64,
    pub decline_score: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct SectionIntelRow {
    pub course_id: Uuid,
    pub class_id: Uuid,
    pub course_name: Option<String>,
    pub class_label: Option<String>,
    pub sessions_finished: usize,
    pub attendance_rate: f64,
    pub section_engagement_score: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct InstructorIntelRow {
    pub instructor_id: Uuid,
    pub instructor_name: Option<String>,
    pub sessions_total: usize,
    pub sessions_finished: usize,
    pub attendance_rate: f64,
    pub punctuality_index: f64,
    pub completion_proxy: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct StudentRiskRow {
    pub student_id: Uuid,
    pub student_name: Option<String>,
    pub sessions_count: usize,
    pub attendance_rate: f64,
    pub punctuality_index: f64,
    pub consistency_score: f64,
    pub volatility: f64,
    pub max_absence_streak: usize,
    pub risk_score: f64,
    pub predicted_low: bool,
}

#[derive(Serialize, Debug, Clone)]
pub struct AnomalyRow {
    pub kind: String,
    pub severity: String,
    pub message: String,
    pub session_id: Option<Uuid>,
    pub course_name: Option<String>,
    pub instructor_name: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct HeatCell {
    pub dow: u8,
    pub hour: u8,
    pub value: f64,
    pub sessions: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct TapAuditSummary {
    pub total_taps: usize,
    pub success_rate: f64,
    pub duplicate_taps: usize,
    pub unknown_card_taps: usize,
}

#[derive(Serialize, Debug, Clone)]
pub struct CohortComparePoint {
    pub label: String,
    pub attendance_rate: f64,
    pub count: usize,
}

/// Aggregated attendance for a batch year + section across all courses.
#[derive(Serialize, Debug, Clone)]
pub struct BatchSectionRow {
    pub class_year: i32,
    pub section: i32,
    pub sessions_finished: usize,
    pub records: usize,
    pub course_count: usize,
    pub attendance_rate: f64,
    pub punctuality_index: f64,
}

/// Per-course performance within a specific batch year and section.
#[derive(Serialize, Debug, Clone)]
pub struct BatchSectionCourseRow {
    pub class_year: i32,
    pub section: i32,
    pub course_id: Uuid,
    pub course_code: Option<String>,
    pub course_name: Option<String>,
    pub sessions_finished: usize,
    pub records: usize,
    pub attendance_rate: f64,
    pub punctuality_index: f64,
}

/// How a single course performs across different batch years (for comparison).
#[derive(Serialize, Debug, Clone)]
pub struct CourseByBatchRow {
    pub course_id: Uuid,
    pub course_code: Option<String>,
    pub course_name: Option<String>,
    pub class_year: i32,
    pub section: i32,
    pub sessions_finished: usize,
    pub attendance_rate: f64,
}

#[derive(Serialize, Debug, Clone)]
pub struct UniversityIntelligence {
    pub meta: AnalyticsMeta,
    pub kpi: UniversityKpi,
    pub status_distribution: Vec<StatusSlice>,
    pub by_day_of_week: Vec<DayBucket>,
    pub by_hour_local: Vec<HourBucket>,
    pub daily_timeline: Vec<DailyPoint>,
    pub courses: Vec<CourseIntelRow>,
    pub sections: Vec<SectionIntelRow>,
    pub instructors: Vec<InstructorIntelRow>,
    pub students_at_risk: Vec<StudentRiskRow>,
    pub anomalies: Vec<AnomalyRow>,
    pub session_heatmap: Vec<HeatCell>,
    pub tap_audit: TapAuditSummary,
    pub cohort_by_class_year: Vec<CohortComparePoint>,
    pub batch_sections: Vec<BatchSectionRow>,
    pub batch_section_courses: Vec<BatchSectionCourseRow>,
    pub courses_by_batch: Vec<CourseByBatchRow>,
}

// ── Report builder ───────────────────────────────────────────────────────────

#[derive(Deserialize, Debug, Default)]
pub struct ReportBuildRequest {
    pub report_type: String,
    #[serde(default)]
    pub from: Option<String>,
    #[serde(default)]
    pub to: Option<String>,
    #[serde(default)]
    pub include_charts: bool,
    /// Filter batch tables to this year (e.g. 3 for third year).
    #[serde(default)]
    pub class_year: Option<i32>,
    /// Filter batch tables to this section number within the year.
    #[serde(default)]
    pub section: Option<i32>,
}

#[derive(Serialize, Debug, Clone)]
pub struct ReportTable {
    pub title: String,
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(Serialize, Debug, Clone)]
pub struct ReportKpiBlock {
    pub title: String,
    pub items: Vec<(String, String)>,
}

#[derive(Serialize, Debug, Clone)]
pub struct ReportDocument {
    pub title: String,
    pub subtitle: String,
    pub generated_at: DateTime<Utc>,
    pub executive_summary: String,
    pub kpis: Vec<ReportKpiBlock>,
    pub tables: Vec<ReportTable>,
}
