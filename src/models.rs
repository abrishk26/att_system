use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
