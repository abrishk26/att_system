-- Your SQL goes here
CREATE TABLE attendance_record (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id),
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    UNIQUE (student_id, session_id)
);
