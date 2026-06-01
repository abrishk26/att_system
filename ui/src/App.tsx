import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';

// Landing Page
import LandingPage from './pages/LandingPage';

// Admin imports
import AdminLayout from './components/admin/Layout';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSessions from './pages/admin/Sessions';
import AdminPermissions from './pages/admin/Permissions';
import AdminAnalytics from './pages/admin/Analytics';
import AdminReports from './pages/admin/Reports';
import AdminStaffManagement from './pages/admin/StaffManagement';
import AdminClassSchedule from './pages/admin/ClassSchedule';
import AdminSettings from './pages/admin/Settings';
import StudentAttendanceReport from './pages/admin/StudentAttendanceReport';
import CourseAttendanceReport from './pages/admin/CourseAttendanceReport';

// Instructor imports
import InstructorLayout from './components/instructor/Layout';
import InstructorLogin from './pages/instructor/LoginPage';
import InstructorDashboard from './pages/instructor/Dashboard';
import InstructorCourses from './pages/instructor/CoursesPage';
import InstructorAttendance from './pages/instructor/AttendancePage';
import InstructorSettings from './pages/instructor/SettingsPage';
import InstructorPermissions from './pages/instructor/PermissionsPage';
import InstructorReports from './pages/instructor/ReportsPage';

// Student imports
import StudentLayout from './components/student/Layout';
import StudentLogin from './pages/student/LoginPage';
import StudentHomePage from './pages/student/HomePage';
import StudentAttendanceHistoryPage from './pages/student/AttendanceHistoryPage';
import StudentCourseDetailPage from './pages/student/CourseDetailPage';
import StudentPermissionsPage from './pages/student/PermissionsPage';
import StudentNotificationsPage from './pages/student/NotificationsPage';

import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin Routes */}
          <Route path="/admin">
            <Route path="login" element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="staff" element={<AdminStaffManagement />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="permissions" element={<AdminPermissions />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="schedule" element={<AdminClassSchedule />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="reports/student-attendance" element={<StudentAttendanceReport />} />
              <Route path="reports/course-attendance" element={<CourseAttendanceReport />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Instructor Routes */}
          <Route path="/instructor">
            <Route path="login" element={<InstructorLogin />} />
            <Route element={<InstructorLayout />}>
              <Route path="dashboard" element={<InstructorDashboard />} />
              <Route path="courses" element={<InstructorCourses />} />
              <Route path="attendance" element={<InstructorAttendance />} />
              <Route path="settings" element={<InstructorSettings />} />
              <Route path="permissions" element={<InstructorPermissions />} />
              <Route path="reports" element={<InstructorReports />} />
            </Route>
            <Route path="*" element={<Navigate to="/instructor/dashboard" replace />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student">
            <Route path="login" element={<StudentLogin />} />
            <Route element={<StudentLayout />}>
              <Route path="home" element={<StudentHomePage />} />
              <Route path="history" element={<StudentAttendanceHistoryPage />} />
              <Route path="course/:courseId" element={<StudentCourseDetailPage />} />
              <Route path="permissions" element={<StudentPermissionsPage />} />
              <Route path="notifications" element={<StudentNotificationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/student/home" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
