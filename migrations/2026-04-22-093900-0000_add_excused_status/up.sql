-- Add 'excused' to the attendance_record status check constraint
ALTER TABLE attendance_record DROP CONSTRAINT attendance_record_status_check;
ALTER TABLE attendance_record ADD CONSTRAINT attendance_record_status_check CHECK (status IN ('present', 'absent', 'late', 'excused'));
