import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.tsx';
import StudentDashboard from './pages/student/StudentDashboard';
import HomePage from './pages/student/HomePage';
import SchedulePage from './pages/student/SchedulePage';
import AttendanceHistoryPage from './pages/student/AttendanceHistoryPage';
import CourseDetailPage from './pages/student/CourseDetailPage';
import PermissionsPage from './pages/student/PermissionsPage';
import NotificationsPage from './pages/student/NotificationsPage';
import ProfilePage from './pages/student/ProfilePage';

function App() {
  const hasToken = Boolean(localStorage.getItem('auth_token'));

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={hasToken ? '/student/home' : '/login'} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student" element={<StudentDashboard />}>
          <Route path="home" element={<HomePage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="history" element={<AttendanceHistoryPage />} />
          <Route path="course/:courseId" element={<CourseDetailPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to={hasToken ? '/student/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
