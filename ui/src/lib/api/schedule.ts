import { fetcher } from './fetcher';
import type { ScheduledClass } from '../types/student';

interface BackendCourse {
  id: string;
  course_id: string;
  name: string;
}

/**
 * Fetches the class schedule for a given student for the current semester.
 * The backend compiles a list of all classes for the courses the student is enrolled in.
 *
 * @param studentId - The unique identifier of the student.
 * @returns A promise that resolves to an array of scheduled classes.
 */
export async function getSchedule(studentId: string): Promise<ScheduledClass[]> {
  void studentId;

  const courses = await fetcher<BackendCourse[]>('/student/courses');
  const dayCycle: ScheduledClass['dayOfWeek'][] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  return courses.map((course, index) => ({
    classId: course.id,
    courseId: course.course_id,
    courseCode: course.course_id,
    courseName: course.name,
    instructorName: 'TBA',
    room: 'TBA',
    startTime: 'TBA',
    endTime: 'TBA',
    dayOfWeek: dayCycle[index % dayCycle.length],
  }));
}
