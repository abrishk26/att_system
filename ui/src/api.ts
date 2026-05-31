const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
import type { Notification } from './lib/types/student';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name?: string;
  role: string;
  img_url?: string;
  nfc_id?: string;
}

export interface StudentProfile {
  id: string;
  nfc_id: string;
  first_name: string;
  last_name?: string;
  username: string;
  img_url?: string;
  attendance_percentage?: number;
}

export interface Course {
  id: string;
  course_id: string;
  name: string;
}

export interface Class {
  id: string;
  year: number;
  section: number;
}

export interface Assignment {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
}

export interface EnrichedAssignment {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  class_year: number;
  class_section: number;
  day?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
}

export interface ScheduleItem {
  course_id: string;
  class_id: string;
  course_name: string;
  class_year: string;
  class_section: string;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
}

export interface Session {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
  status: string;
  created_at: string; // ISO 8601 UTC — B-01
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
  client_id?: string;
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student_name: string;
  nfc_id: string;
}

export interface Permission {
  id: string;
  session_id: string;
  student_id: string;
  description: string;
  img_url?: string;
  status: string;
  created_at: string; // ISO 8601 UTC — B-09
}

export interface PermissionWithStudent extends Permission {
  student_name: string; // B-10
}

// B-05 batch update
export interface BatchUpdateItem {
  nfc_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface BatchUpdateRequest {
  session_id: string;
  updates: BatchUpdateItem[];
}

// B-11 offline sync
export interface OfflineSyncRecord {
  client_id: string;
  nfc_id: string;
  session_id: string;
  status: string;
  client_timestamp?: string;
}

export interface OfflineSyncDetail {
  client_id: string;
  result: 'success' | 'skipped' | 'failed';
  reason?: string;
}

export interface OfflineSyncResponse {
  processed: number;
  skipped: number;
  failed: number;
  details: OfflineSyncDetail[];
}

export interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalCourses: number;
  presentToday: number;
  absentToday: number;
  avgAttendance: number;
  completionRate: number;
}

export interface AttendanceTrend {
  day: string;
  actual: number;
  target: number;
}

export interface AttendanceDistribution {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export interface CoursePerformance {
  course: string;
  attendance: number;
  sessions: number;
}

export interface InstructorDashboardMetrics {
  stats: {
    active_courses: number;
    total_sessions: number;
    avg_attendance: number;
    total_students: number;
  };
  trends: Array<{ date: string; rate: number }>;
  course_performance: Array<{ course_id: string; course_name?: string | null; attendance_rate: number }>;
}

export interface StudentDashboardMetrics {
  overall_attendance: number;
  courses_performance: Array<{ course_name: string; percentage: number }>;
  attendance_trend: Array<{ date: string; status: string }>;
}

export interface TapLogEntry {
  id: string;
  nfc_id: string;
  session_id: string;
  student_id?: string;
  student_name?: string;
  success: boolean;
  reason?: string;
  tapped_at: string;
}

export interface DepartmentAnalytics {
  total_students: number;
  total_sessions: number;
  total_instructors: number;
  avg_attendance_rate: number;
  attendance_by_day: Array<{ day: string; rate: number; sessions: number }>;
  top_courses: Array<{ course_id: string; course_name?: string; attendance_rate: number; session_count: number }>;
  bottom_courses: Array<{ course_id: string; course_name?: string; attendance_rate: number; session_count: number }>;
  instructor_breakdown: Array<{ instructor_id: string; instructor_name?: string; sessions: number; avg_attendance: number }>;
}

/** GET /admin/analytics/university — enriched institutional intelligence */
export interface UniversityIntelligence {
  meta: { generated_at: string; from?: string; to?: string };
  kpi: {
    total_sessions: number;
    finished_sessions: number;
    active_sessions: number;
    incoming_sessions: number;
    unique_students: number;
    unique_instructors: number;
    unique_course_offerings: number;
    overall_attendance_rate: number;
    punctuality_index: number;
    excused_rate: number;
    absent_rate: number;
    late_rate: number;
    record_completeness: number;
  };
  status_distribution: Array<{ status: string; count: number; pct: number }>;
  by_day_of_week: Array<{
    day: string;
    attendance_rate: number;
    punctuality_index: number;
    sessions: number;
    records: number;
  }>;
  by_hour_local: Array<{ hour: number; attendance_rate: number; sessions: number }>;
  daily_timeline: Array<{ date: string; attendance_rate: number; sessions: number }>;
  courses: Array<{
    course_id: string;
    course_code?: string;
    course_name?: string;
    sessions_finished: number;
    records: number;
    attendance_rate: number;
    punctuality_index: number;
    decline_score: number;
  }>;
  sections: Array<{
    course_id: string;
    class_id: string;
    course_name?: string;
    class_label?: string;
    sessions_finished: number;
    attendance_rate: number;
    section_engagement_score: number;
  }>;
  instructors: Array<{
    instructor_id: string;
    instructor_name?: string;
    sessions_total: number;
    sessions_finished: number;
    attendance_rate: number;
    punctuality_index: number;
    completion_proxy: number;
  }>;
  students_at_risk: Array<{
    student_id: string;
    student_name?: string;
    sessions_count: number;
    attendance_rate: number;
    punctuality_index: number;
    consistency_score: number;
    volatility: number;
    max_absence_streak: number;
    risk_score: number;
    predicted_low: boolean;
  }>;
  anomalies: Array<{
    kind: string;
    severity: string;
    message: string;
    session_id?: string;
    course_name?: string;
    instructor_name?: string;
  }>;
  session_heatmap: Array<{ dow: number; hour: number; value: number; sessions: number }>;
  tap_audit: { total_taps: number; success_rate: number; duplicate_taps: number; unknown_card_taps: number };
  cohort_by_class_year: Array<{ label: string; attendance_rate: number; count: number }>;
}

export interface ReportBuildRequest {
  report_type: string;
  from?: string;
  to?: string;
  include_charts?: boolean;
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  generated_at: string;
  executive_summary: string;
  kpis: Array<{ title: string; items: string[][] }>;
  tables: Array<{ title: string; columns: string[]; rows: string[][] }>;
}

let onTokenUpdate: ((token: string | null) => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const refresh_token = localStorage.getItem('refresh_token');
  if (!refresh_token) return null;
  
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) {
        if (onTokenUpdate) onTokenUpdate(null);
        return null;
      }
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      if (onTokenUpdate) onTokenUpdate(data.access_token);
      return data.access_token;
    } catch {
      if (onTokenUpdate) onTokenUpdate(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function authHeaders(token?: string, isMultipart = false): HeadersInit {
  const t = token ?? localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function request<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
  const isMultipart = options?.body instanceof FormData;
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: { ...authHeaders(undefined, isMultipart), ...options?.headers }
  });

  if (res.status === 401 && retry && path !== '/login' && path !== '/auth/login/nfc') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const res2 = await fetch(`${BASE_URL}/api${path}`, {
        ...options,
        headers: { ...authHeaders(newToken, isMultipart), ...options?.headers },
      });
      if (res2.ok) return res2.json();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw new Error('Session expired. Please log in again.');
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `${res.status} ${res.statusText}`;
    if (res.status === 401) {
      message = 'Invalid username or password. Please try again.';
    } else if (res.status === 405) {
      message = 'Invalid request. Please refresh the page and try again.';
    } else if (res.status === 500) {
      message = 'Server error. Please try again later.';
    } else {
      try {
        const errorData = JSON.parse(text);
        message = errorData.message ?? message;
      } catch {
        message = text || message;
      }
    }
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  request,
  setOnTokenUpdate: (cb: (token: string | null) => void) => {
    onTokenUpdate = cb;
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  login: (username: string, password: string) =>
    request<{ access_token: string; refresh_token: string; role: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  /** B-07: NFC card login */
  nfcLogin: (nfc_id: string) =>
    request<{ access_token: string; refresh_token: string; role: string }>('/auth/login/nfc', {
      method: 'POST',
      body: JSON.stringify({ nfc_id }),
    }),

  /** B-03: Server-side token revocation */
  logout: (refresh_token: string) =>
    request<{ message: string }>('/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),

  // ── Profile ─────────────────────────────────────────────────────────────────
  profile: () => request<UserProfile>('/profile'),

  /** B-12: Token identity verification */
  verify: () => request<{ user_id: string; role: string }>('/auth/verify'),

  // ── Schedule ─────────────────────────────────────────────────────────────────
  /** B-04: timetable for the current user */
  schedule: () => request<ScheduleItem[]>('/schedule'),

  // ── Instructor assignments ───────────────────────────────────────────────────
  instructorAssignments: () => request<Assignment[]>('/instructor/assignments'),
  /** B-08: enriched assignments (course name + class info) */
  enrichedAssignments: () => request<EnrichedAssignment[]>('/instructor/assignments/enriched'),

  // ── Sessions ─────────────────────────────────────────────────────────────────
  instructorSessions: (filters?: { course_id?: string; class_id?: string; date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.course_id) params.append('course_id', filters.course_id);
    if (filters?.class_id) params.append('class_id', filters.class_id);
    if (filters?.date) params.append('date', filters.date);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<Session[]>(`/sessions/instructor${qs}`);
  },
  allSessions: () => request<Session[]>('/session'),
  studentSessionsFull: () => request<Session[]>('/student/sessions'),

  createSession: (body: { instructor_id: string; class_id: string; course_id: string }) =>
    request<Session>('/session/create', { method: 'POST', body: JSON.stringify(body) }),

  updateSession: (session_id: string, status: string) =>
    request<Session>('/session/update', {
      method: 'PATCH',
      body: JSON.stringify({ session_id, status }),
    }),

  // ── Attendance records ───────────────────────────────────────────────────────
  sessionRecords: (sessionId: string) =>
    request<AttendanceRecordWithStudent[]>(`/record/${sessionId}`),

  markAttendance: (nfc_id: string, session_id: string, status: string) =>
    request<AttendanceRecord>('/record/update', {
      method: 'PATCH',
      body: JSON.stringify({ nfc_id, session_id, status }),
    }),

  /** B-05: batch attendance update */
  batchUpdateAttendance: (body: BatchUpdateRequest) =>
    request<AttendanceRecordWithStudent[]>('/record/batch-update', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  /** B-11: idempotent offline sync */
  offlineSync: (records: OfflineSyncRecord[]) =>
    request<OfflineSyncResponse>('/record/offline-sync', {
      method: 'POST',
      body: JSON.stringify({ records }),
    }),

  // ── Permissions ──────────────────────────────────────────────────────────────
  /** B-02: global permission inbox with optional status filter */
  allPermissions: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<PermissionWithStudent[]>(`/instructor/permissions${qs}`);
  },

  permissionsBySession: (sessionId: string) =>
    request<PermissionWithStudent[]>(`/instructor/permissions/${sessionId}`),

  updatePermission: (id: string, status: string) =>
    request(`/instructor/permissions/update/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  studentPermissions: () => request<Permission[]>('/student/permissions'),

  createPermission: (formData: FormData) =>
    request<Permission>('/student/permissions', {
      method: 'POST',
      body: formData,
    }),

  // ── Course / Class ───────────────────────────────────────────────────────────
  courseDetails: (id: string) => request<Course>(`/course/${id}`),
  classDetails: (id: string) => request<Class>(`/class/${id}`),

  // ── Instructor helpers ───────────────────────────────────────────────────────
  studentCount: (courseId: string, classId: string) =>
    request<number>(`/instructor/student-count?course_id=${courseId}&class_id=${classId}`),

  attendanceStats: () => request<number>('/instructor/attendance-stats'),

  instructorStudents: (courseId: string, classId: string) =>
    request<StudentProfile[]>(`/instructor/students?course_id=${courseId}&class_id=${classId}`),

  instructorDashboardMetrics: () =>
    request<InstructorDashboardMetrics>('/instructor/dashboard-metrics'),

  // ── Student helpers ──────────────────────────────────────────────────────────
  studentCourses: () => request<Course[]>('/student/courses'),
  studentSessions: () => request<AttendanceRecord[]>('/sessions/student'),
  studentDashboardMetrics: () => request<StudentDashboardMetrics>('/student/dashboard-metrics'),

  // ── Tap Log (NFC audit trail) ────────────────────────────────────────────────
  tapLog: (sessionId: string) => request<TapLogEntry[]>(`/tap-log/${sessionId}`),

  // ── Admin / Department Head ──────────────────────────────────────────────────
  adminAnalytics: () => request<DepartmentAnalytics>('/admin/analytics'),

  /** Institutional analytics (Chart.js dashboards consume this). */
  universityAnalytics: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<UniversityIntelligence>(`/admin/analytics/university${qs}`);
  },

  adminStudentAnalytics: (studentId: string, params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<Record<string, unknown>>(`/admin/analytics/student/${studentId}${qs}`);
  },

  buildReport: (body: ReportBuildRequest) =>
    request<ReportDocument>('/admin/reports/build', { method: 'POST', body: JSON.stringify(body) }),

  // ── Notifications ────────────────────────────────────────────────────────────
  getNotifications: () => request<Notification[]>('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
};

// Helper function for dashboard data
export async function fetchDashboardData(_user: UserProfile) {
  const sessions = await api.allSessions();
  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'finished');
  const activeSessions = sessions.filter(s => s.status === 'active');
  const uniqueCourseIds = Array.from(new Set(sessions.map(s => s.course_id)));
  const recentCompleted = completedSessions.slice(0, 20);
  const recordsPromises = recentCompleted.map(s =>
    api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[])
  );
  const allRecords = await Promise.all(recordsPromises);
  let totalPresent = 0; let totalRecords = 0;
  allRecords.forEach(records => {
    totalRecords += records.length;
    totalPresent += records.filter(r => r.status === 'present').length;
  });
  const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
  const completionRate = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;
  const stats: DashboardStats = {
    totalSessions: sessions.length, activeSessions: activeSessions.length,
    completedSessions: completedSessions.length, totalCourses: uniqueCourseIds.length,
    presentToday: totalPresent, absentToday: totalRecords - totalPresent,
    avgAttendance, completionRate,
  };
  const trends: AttendanceTrend[] = [
    { day: 'Mon', actual: avgAttendance - 5, target: 85 },
    { day: 'Tue', actual: avgAttendance - 3, target: 85 },
    { day: 'Wed', actual: avgAttendance - 2, target: 85 },
    { day: 'Thu', actual: avgAttendance, target: 85 },
    { day: 'Fri', actual: avgAttendance + 2, target: 85 },
    { day: 'Sat', actual: avgAttendance + 1, target: 85 },
    { day: 'Sun', actual: avgAttendance, target: 85 },
  ];
  const sessionAttendanceRates = await Promise.all(
    recentCompleted.map(async (s) => {
      const records = await api.sessionRecords(s.id).catch(() => []);
      const present = records.filter(r => r.status === 'present').length;
      return records.length > 0 ? (present / records.length) * 100 : 0;
    })
  );
  const distribution: AttendanceDistribution = {
    excellent: sessionAttendanceRates.filter(r => r >= 90).length,
    good: sessionAttendanceRates.filter(r => r >= 80 && r < 90).length,
    fair: sessionAttendanceRates.filter(r => r >= 70 && r < 80).length,
    poor: sessionAttendanceRates.filter(r => r < 70).length,
  };
  const courseMap = new Map<string, { present: number; total: number; sessions: number }>();
  for (let i = 0; i < recentCompleted.length; i++) {
    const session = recentCompleted[i]; const records = allRecords[i];
    if (!courseMap.has(session.course_id)) courseMap.set(session.course_id, { present: 0, total: 0, sessions: 0 });
    const cd = courseMap.get(session.course_id)!;
    cd.present += records.filter(r => r.status === 'present').length;
    cd.total += records.length; cd.sessions += 1;
  }
  const performancePromises = Array.from(courseMap.entries()).map(async ([courseId, data]) => {
    const course = await api.courseDetails(courseId).catch(() => null);
    return { course: course?.course_id || courseId.slice(0, 8), attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0, sessions: data.sessions };
  });
  const performance = await Promise.all(performancePromises);
  return { stats, trends, distribution, performance };
}
