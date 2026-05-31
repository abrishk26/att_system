import { fetcher } from './fetcher';
import type { CourseAttendance, SessionRecord } from '../types/student';

interface BackendAttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
}

interface BackendSession {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
  status: string;
  created_at: string;
}

interface BackendCourse {
  id: string;
  course_id: string;
  name: string;
}

/**
 * Fetches the overall attendance history for a given student.
 */
export async function getAttendanceHistory(studentId: string): Promise<CourseAttendance[]> {
  void studentId;

  const [attendanceRecords, allSessions, registeredCourses] = await Promise.all([
    fetcher<BackendAttendanceRecord[]>('/sessions/student'),
    fetcher<BackendSession[]>('/student/sessions'),
    fetcher<BackendCourse[]>('/student/courses'),
  ]);

  const sessionsById = new Map(allSessions.map((session) => [session.id, session]));

  const recordsByCourse = new Map<string, BackendAttendanceRecord[]>();
  for (const record of attendanceRecords) {
    const session = sessionsById.get(record.session_id);
    if (session) {
      const current = recordsByCourse.get(session.course_id) ?? [];
      current.push(record);
      recordsByCourse.set(session.course_id, current);
    }
  }

  return registeredCourses.map((course) => {
    const courseRecords = recordsByCourse.get(course.id) ?? [];
    const totalSessions = courseRecords.length;
    const present = courseRecords.filter((record) => record.status === 'present').length;
    const late = courseRecords.filter((record) => record.status === 'late').length;
    const absent = courseRecords.filter((record) => record.status === 'absent').length;
    const excused = courseRecords.filter((record) => record.status === 'excused').length;

    return {
      courseId: course.id,
      courseCode: course.course_id,
      courseName: course.name,
      totalSessions,
      present,
      late,
      absent,
      excused,
      attendancePercentage:
        totalSessions > 0 ? Math.round(((present + late) / totalSessions) * 100) : 0,
    };
  });
}

/**
 * Fetches session-by-session attendance for a specific course.
 */
export async function getCourseDetail(
  studentId: string,
  courseId: string
): Promise<SessionRecord[]> {
  void studentId;

  const [attendanceRecords, studentSessions, course] = await Promise.all([
    fetcher<BackendAttendanceRecord[]>('/sessions/student'),
    fetcher<BackendSession[]>('/student/sessions'),
    fetcher<BackendCourse>(`/course/${courseId}`),
  ]);

  const sessionsById = new Map(studentSessions.map((session) => [session.id, session]));

  const results: SessionRecord[] = [];

  for (const record of attendanceRecords) {
    const session = sessionsById.get(record.session_id);
    if (!session || session.course_id !== courseId) {
      continue;
    }

    const sessionDate = session.created_at
      ? new Date(session.created_at)
      : null;

    results.push({
      sessionId: session.id,
      classId: session.class_id,
      courseId,
      courseName: course.name,
      date: sessionDate ? sessionDate.toISOString() : 'TBA',
      startTime: sessionDate
        ? sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—',
      status: record.status as SessionRecord['status'],
      method: 'manual',
    });
  }

  return results.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
