CREATE TABLE tap_log (
    id UUID PRIMARY KEY,
    nfc_id TEXT NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id),
    student_id UUID,
    success BOOLEAN NOT NULL,
    reason TEXT,
    tapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
