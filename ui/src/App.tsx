import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';

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

// Student imports
import StudentDashboard from './pages/student/StudentDashboard';
import StudentLogin from './pages/student/LoginPage';
import StudentHomePage from './pages/student/HomePage';
import StudentSchedulePage from './pages/student/SchedulePage';
import StudentAttendanceHistoryPage from './pages/student/AttendanceHistoryPage';
import StudentCourseDetailPage from './pages/student/CourseDetailPage';
import StudentPermissionsPage from './pages/student/PermissionsPage';
import StudentNotificationsPage from './pages/student/NotificationsPage';
import StudentProfilePage from './pages/student/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            </Route>
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student">
            <Route path="login" element={<StudentLogin />} />
            <Route element={<StudentDashboard />}>
              <Route path="home" element={<StudentHomePage />} />
              <Route path="schedule" element={<StudentSchedulePage />} />
              <Route path="history" element={<StudentAttendanceHistoryPage />} />
              <Route path="course/:courseId" element={<StudentCourseDetailPage />} />
              <Route path="permissions" element={<StudentPermissionsPage />} />
              <Route path="notifications" element={<StudentNotificationsPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/student/home" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
