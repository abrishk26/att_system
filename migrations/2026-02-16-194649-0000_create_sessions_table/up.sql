-- Your SQL goes here
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    instructor_id UUID NOT NULL ,
    class_id UUID NOT NULL,
    course_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('incoming', 'active', 'finished'))
)
