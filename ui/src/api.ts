const BASE_URL = 'http://localhost:3001';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name?: string;
  role: string;
  img_url?: string;
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
}

export interface Session {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
  status: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  status: string;
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student_name: string;
  nfc_id: string;
}

export interface PermissionWithStudent {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  description: string;
  img_url?: string;
  status: string;
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

export interface ActivityItem {
  type: 'success' | 'warning' | 'info';
  message: string;
  detail: string;
  time: string;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh_token = localStorage.getItem('refresh_token');
  if (!refresh_token) return null;
  try {
    const res = await fetch(`${BASE_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function authHeaders(token?: string): HeadersInit {
  const t = token ?? localStorage.getItem('access_token');
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function request<T>(path: string, options?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: authHeaders() });

  if (res.status === 401 && retry && path !== '/login') {
    // Only try to refresh token if this is not a login request
    const newToken = await refreshAccessToken();
    if (newToken) {
      const res2 = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: authHeaders(newToken),
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
    
    // Handle specific error cases with user-friendly messages
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
  login: (username: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  profile: () => request<UserProfile>('/profile'),

  instructorAssignments: () => request<Assignment[]>('/instructor/assignments'),

  instructorSessions: () => request<Session[]>('/sessions/instructor'),

  allSessions: () => request<Session[]>('/session'),

  courseDetails: (id: string) => request<Course>(`/course/${id}`),

  classDetails: (id: string) => request<Class>(`/class/${id}`),

  sessionRecords: (sessionId: string) =>
    request<AttendanceRecordWithStudent[]>(`/record/${sessionId}`),

  permissionsBySession: (sessionId: string) =>
    request<PermissionWithStudent[]>(`/instructor/permissions/${sessionId}`),

  updatePermission: (id: string, status: string) =>
    request(`/instructor/permissions/update/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  createSession: (body: { instructor_id: string; class_id: string; course_id: string }) =>
    request<Session>('/session/create', { method: 'POST', body: JSON.stringify(body) }),

  updateSession: (session_id: string, status: string) =>
    request<Session>('/session/update', {
      method: 'PATCH',
      body: JSON.stringify({ session_id, status }),
    }),
};

// Helper function to fetch and calculate dashboard data from backend
export async function fetchDashboardData(_user: UserProfile) {
  const sessions = await api.allSessions();
  
  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'finished');
  const activeSessions = sessions.filter(s => s.status === 'active');
  
  // Get unique course IDs
  const uniqueCourseIds = Array.from(new Set(sessions.map(s => s.course_id)));
  
  // Fetch attendance records for completed sessions (limit to recent ones for performance)
  const recentCompleted = completedSessions.slice(0, 20);
  const recordsPromises = recentCompleted.map(s => 
    api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[])
  );
  const allRecords = await Promise.all(recordsPromises);
  
  // Calculate stats
  let totalPresent = 0;
  let totalRecords = 0;
  
  allRecords.forEach(records => {
    totalRecords += records.length;
    totalPresent += records.filter(r => r.status === 'present').length;
  });
  
  const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
  const completionRate = sessions.length > 0 
    ? Math.round((completedSessions.length / sessions.length) * 100) 
    : 0;
  
  // Stats
  const stats: DashboardStats = {
    totalSessions: sessions.length,
    activeSessions: activeSessions.length,
    completedSessions: completedSessions.length,
    totalCourses: uniqueCourseIds.length,
    presentToday: totalPresent,
    absentToday: totalRecords - totalPresent,
    avgAttendance,
    completionRate,
  };
  
  // Trends (last 7 days mock - would need timestamp in backend)
  const trends: AttendanceTrend[] = [
    { day: 'Mon', actual: avgAttendance - 5, target: 85 },
    { day: 'Tue', actual: avgAttendance - 3, target: 85 },
    { day: 'Wed', actual: avgAttendance - 2, target: 85 },
    { day: 'Thu', actual: avgAttendance, target: 85 },
    { day: 'Fri', actual: avgAttendance + 2, target: 85 },
    { day: 'Sat', actual: avgAttendance + 1, target: 85 },
    { day: 'Sun', actual: avgAttendance, target: 85 },
  ];
  
  // Distribution
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
  
  // Course performance
  const courseMap = new Map<string, { present: number; total: number; sessions: number }>();
  
  for (let i = 0; i < recentCompleted.length; i++) {
    const session = recentCompleted[i];
    const records = allRecords[i];
    
    if (!courseMap.has(session.course_id)) {
      courseMap.set(session.course_id, { present: 0, total: 0, sessions: 0 });
    }
    
    const courseData = courseMap.get(session.course_id)!;
    courseData.present += records.filter(r => r.status === 'present').length;
    courseData.total += records.length;
    courseData.sessions += 1;
  }
  
  const performancePromises = Array.from(courseMap.entries()).map(async ([courseId, data]) => {
    const course = await api.courseDetails(courseId).catch(() => null);
    return {
      course: course?.course_id || courseId.slice(0, 8),
      attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      sessions: data.sessions,
    };
  });
  
  const performance = await Promise.all(performancePromises);
  
  // Activity
  const activity: ActivityItem[] = [
    {
      type: 'success',
      message: 'Session completed',
      detail: `${completedSessions.length} sessions completed`,
      time: 'Just now',
    },
    {
      type: 'info',
      message: 'Active sessions',
      detail: `${activeSessions.length} sessions in progress`,
      time: '5 min ago',
    },
  ];
  
  return { stats, trends, distribution, performance, activity };
}
