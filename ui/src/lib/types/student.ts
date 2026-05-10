export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'
export type PermissionStatus = 'pending' | 'accepted' | 'rejected'

// from users + students tables
export interface StudentProfile {
  userId: string
  name: string
  studentId: string        // from students.student_id
  email: string
  major: string
  nfcCardId: string | null // from students.nfc_card_id
  nfcCardStatus: 'active' | 'inactive' | 'not_assigned'
}

// from enrollments + courses + classes
export interface CourseAttendance {
  courseId: string
  courseCode: string       // from courses.course_code
  courseName: string       // from courses.course_name
  totalSessions: number    // count of classes rows for this course
  present: number
  late: number
  absent: number
  excused: number
  attendancePercentage: number
}

// from classes table — one row per session the student attended or missed
export interface SessionRecord {
  classId: string          // classes.id
  courseId: string
  courseName: string
  date: string             // classes.date
  startTime: string        // classes.start_time
  status: AttendanceStatus
  method: 'nfc' | 'manual'
}

// from classes + courses + assignments + instructors + users
export interface ScheduledClass {
  classId: string
  courseId: string
  courseCode: string
  courseName: string
  instructorName: string   // from users.name joined through assignments + instructors
  room: string             // from classes.room
  startTime: string
  endTime: string
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
}

export interface PermissionRequest {
  permissionId: string
  sessionId: string
  studentId: string
  description: string
  imgUrl: string | null
  status: PermissionStatus
}

// mock only — no backend table yet
export interface Notification {
  id: string
  user_id: string
  notification_type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  action_url: string | null
}
