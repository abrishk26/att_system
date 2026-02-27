-- Your SQL goes here
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id),
    student_id UUID NOT NULL,
    description TEXT NOT NULL,
    img_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected'))
)
