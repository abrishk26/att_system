// @generated automatically by Diesel CLI.

diesel::table! {
    assignments (id) {
        id -> Uuid,
        instructor_id -> Uuid,
        class_id -> Uuid,
        course_id -> Uuid,
    }
}

diesel::table! {
    attendance_record (id) {
        id -> Uuid,
        student_id -> Uuid,
        session_id -> Uuid,
        status -> Text,
    }
}

diesel::table! {
    classes (id) {
        id -> Uuid,
        year -> Int4,
        section -> Int4,
    }
}

diesel::table! {
    courses (id) {
        id -> Uuid,
        course_id -> Text,
        name -> Text,
    }
}

diesel::table! {
    enrollments (id) {
        id -> Uuid,
        student_id -> Uuid,
        course_id -> Uuid,
    }
}

diesel::table! {
    instructors (id) {
        id -> Uuid,
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
    profiles (id) {
        id -> Uuid,
        first_name -> Text,
        last_name -> Nullable<Text>,
        username -> Text,
        password_hash -> Text,
        img_url -> Nullable<Text>,
        role -> Text,
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

diesel::table! {
    students (id) {
        id -> Uuid,
        class_id -> Uuid,
        nfc_id -> Text,
    }
}

diesel::joinable!(assignments -> classes (class_id));
diesel::joinable!(assignments -> courses (course_id));
diesel::joinable!(assignments -> instructors (instructor_id));
diesel::joinable!(attendance_record -> sessions (session_id));
diesel::joinable!(enrollments -> courses (course_id));
diesel::joinable!(enrollments -> students (student_id));
diesel::joinable!(instructors -> profiles (id));
diesel::joinable!(permissions -> sessions (session_id));
diesel::joinable!(students -> classes (class_id));
diesel::joinable!(students -> profiles (id));

diesel::allow_tables_to_appear_in_same_query!(
    assignments,
    attendance_record,
    classes,
    courses,
    enrollments,
    instructors,
    permissions,
    profiles,
    sessions,
    students,
);
