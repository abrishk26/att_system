// @generated automatically by Diesel CLI.

diesel::table! {
    attendance_record (id) {
        id -> Uuid,
        student_id -> Uuid,
        session_id -> Uuid,
        status -> Text,
    }
}

diesel::table! {
    permissions (id) {
        id -> Uuid,
        session_id -> Uuid,
        student_id -> Uuid,
        description -> Text,
        img_url -> Nullable<Text>,
        status -> Text,
    }
}

diesel::table! {
    sessions (id) {
        id -> Uuid,
        instructor_id -> Uuid,
        class_id -> Uuid,
        course_id -> Uuid,
        status -> Text,
    }
}

diesel::joinable!(attendance_record -> sessions (session_id));
diesel::joinable!(permissions -> sessions (session_id));

diesel::allow_tables_to_appear_in_same_query!(attendance_record, permissions, sessions,);
