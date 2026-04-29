use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;


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
}

#[derive(Queryable, Selectable, Insertable, Serialize, Deserialize, Debug, Clone)]
#[diesel(table_name = crate::schema::attendance_record)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub student_id: Uuid,
    pub session_id: Uuid,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AttendanceRecordWithStudent {
    pub id: Uuid,
    pub student_id: Uuid,
    pub session_id: Uuid,
    pub status: String,
    pub student_name: String,
    pub nfc_id: String,
}

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
pub struct PermissionWithStudent {
    pub id: Uuid,
    pub session_id: Uuid,
    pub student_id: Uuid,
    pub student_name: String,
    pub description: String,
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
    pub attendance_percentage: Option<f64>,
}

#[derive(Deserialize)]
pub struct UpdatePermissionStatusRequest {
    pub status: String,
}
