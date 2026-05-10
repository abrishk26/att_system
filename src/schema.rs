// @generated automatically by Diesel CLI.

diesel::table! {
    attendance_record (id) {
        id -> Uuid,
        student_id -> Uuid,
        session_id -> Uuid,
        status -> Text,
        client_id -> Nullable<Uuid>,
    }
}

diesel::table! {
    notifications (id) {
        id -> Uuid,
        user_id -> Uuid,
        title -> Varchar,
        message -> Text,
        notification_type -> Varchar,
        is_read -> Bool,
        action_url -> Nullable<Varchar>,
        created_at -> Timestamptz,
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
        created_at -> Timestamptz,
    }
}

diesel::table! {
    sessions (id) {
        id -> Uuid,
        instructor_id -> Uuid,
        class_id -> Uuid,
        course_id -> Uuid,
        status -> Text,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    tap_log (id) {
        id -> Uuid,
        nfc_id -> Text,
        session_id -> Uuid,
        student_id -> Nullable<Uuid>,
        success -> Bool,
        reason -> Nullable<Text>,
        tapped_at -> Timestamptz,
    }
}

diesel::table! {
    token_denylist (jti) {
        jti -> Text,
        revoked_at -> Timestamptz,
        expires_at -> Timestamptz,
    }
}

diesel::joinable!(attendance_record -> sessions (session_id));
diesel::joinable!(permissions -> sessions (session_id));
diesel::joinable!(tap_log -> sessions (session_id));

diesel::allow_tables_to_appear_in_same_query!(
    attendance_record,
    notifications,
    permissions,
    sessions,
    tap_log,
    token_denylist,
);
