import { fetcher } from './fetcher';
import { request } from '../../api';
import type { PermissionRequest } from '../types/student';

type BackendPermission = {
  id: string;
  session_id: string;
  student_id: string;
  description: string;
  img_url: string | null;
  status: 'pending' | 'accepted' | 'rejected';
};

type BackendAttendanceRecord = {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
};

type BackendSession = {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
  status: 'incoming' | 'active' | 'finished';
};

type BackendCourse = {
  id: string;
  course_id: string;
  name: string;
};

export type PermissionSessionOption = {
  sessionId: string;
  label: string;
  status: 'incoming' | 'active' | 'finished';
};

export type SubmitPermissionPayload = {
  sessionId: string;
  description: string;
  file?: File | null;
};

const mapPermission = (item: BackendPermission): PermissionRequest => ({
  permissionId: item.id,
  sessionId: item.session_id,
  studentId: item.student_id,
  description: item.description,
  imgUrl: item.img_url,
  status: item.status,
});

export const getPermissionSessionOptions = async (studentId: string): Promise<PermissionSessionOption[]> => {
  void studentId;

  const [records, sessions] = await Promise.all([
    fetcher<BackendAttendanceRecord[]>('/sessions/student'),
    fetcher<BackendSession[]>('/session'),
  ]);

  const studentSessionIds = new Set(records.map((record) => record.session_id));
  const relevantSessions = sessions.filter((session) => studentSessionIds.has(session.id));

  const uniqueCourseIds = Array.from(new Set(relevantSessions.map((session) => session.course_id)));
  const courses = await Promise.all(
    uniqueCourseIds.map((courseId) => fetcher<BackendCourse>(`/course/${courseId}`))
  );
  const courseNameById = new Map(courses.map((course) => [course.id, `${course.course_id} - ${course.name}`]));

  return relevantSessions
    .map((session) => {
      const courseLabel = courseNameById.get(session.course_id) ?? session.course_id;
      return {
        sessionId: session.id,
        label: `${courseLabel} (${session.status})`,
        status: session.status,
      };
    })
    .sort((a, b) => {
      const statusPriority = { active: 0, incoming: 1, finished: 2 } as const;
      return statusPriority[a.status] - statusPriority[b.status];
    });
};

export const getMyPermissions = async (studentId: string): Promise<PermissionRequest[]> => {
  void studentId;
  const permissions = await fetcher<BackendPermission[]>('/student/permissions');
  return permissions.map(mapPermission);
};

export const submitPermission = async (payload: SubmitPermissionPayload): Promise<PermissionRequest> => {
  const formData = new FormData();
  formData.append('session_id', payload.sessionId);
  formData.append('description', payload.description);
  if (payload.file) {
    formData.append('file', payload.file);
  }

  const created = await request<BackendPermission>('/student/permissions', {
    method: 'POST',
    body: formData,
  });
  return mapPermission(created);
};
