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
}

interface BackendCourse {
  id: string;
  course_id: string;
  name: string;
}

/**
 * Fetches the overall attendance history for a given student.
 * The backend calculates the summary for each course the student is enrolled in.
 *
 * @param studentId - The unique identifier of the student.
 * @returns A promise that resolves to an array of course attendance summaries.
 */
export async function getAttendanceHistory(studentId: string): Promise<CourseAttendance[]> {
  void studentId;

  const [attendanceRecords, sessions] = await Promise.all([
    fetcher<BackendAttendanceRecord[]>('/sessions/student'),
    fetcher<BackendSession[]>('/session'),
  ]);

  const sessionsById = new Map(sessions.map(session => [session.id, session]));
  const recordsByCourse = new Map<string, BackendAttendanceRecord[]>();

  for (const record of attendanceRecords) {
    const session = sessionsById.get(record.session_id);
    if (!session) {
      continue;
    }

    const currentRecords = recordsByCourse.get(session.course_id) ?? [];
    currentRecords.push(record);
    recordsByCourse.set(session.course_id, currentRecords);
  }

  const courseIds = Array.from(recordsByCourse.keys());
  const courses = await Promise.all(
    courseIds.map((courseId) => fetcher<BackendCourse>(`/course/${courseId}`))
  );

  const courseById = new Map(courses.map(course => [course.id, course]));

  return courseIds.map((courseId) => {
    const course = courseById.get(courseId);
    const courseRecords = recordsByCourse.get(courseId) ?? [];
    const totalSessions = courseRecords.length;
    const present = courseRecords.filter(record => record.status === 'present').length;
    const late = courseRecords.filter(record => record.status === 'late').length;
    const absent = courseRecords.filter(record => record.status === 'absent').length;
    const excused = courseRecords.filter(record => record.status === 'excused').length;

    return {
      courseId,
      courseCode: course?.course_id ?? courseId,
      courseName: course?.name ?? 'Unknown course',
      totalSessions,
      present,
      late,
      absent,
      excused,
      attendancePercentage: totalSessions > 0 ? Math.round(((present + late) / totalSessions) * 100) : 0,
    };
  });
}

/**
 * Fetches the detailed session-by-session attendance record for a specific course.
 *
 * @param studentId - The unique identifier of the student.
 * @param courseId - The unique identifier of the course.
 * @returns A promise that resolves to an array of individual session records.
 */
export async function getCourseDetail(studentId: string, courseId: string): Promise<SessionRecord[]> {
  void studentId;

  const [attendanceRecords, sessions, course] = await Promise.all([
    fetcher<BackendAttendanceRecord[]>('/sessions/student'),
    fetcher<BackendSession[]>('/session'),
    fetcher<BackendCourse>(`/course/${courseId}`),
  ]);

  const sessionsById = new Map(sessions.map(session => [session.id, session]));

  const results: SessionRecord[] = [];

  for (const record of attendanceRecords) {
    const session = sessionsById.get(record.session_id);
    if (!session || session.course_id !== courseId) {
      continue;
    }

    results.push({
      classId: session.id,
      courseId,
      courseName: course.name,
      date: 'TBA',
      startTime: 'TBA',
      status: record.status as SessionRecord['status'],
      method: 'manual',
    });
  }

  return results;
}
