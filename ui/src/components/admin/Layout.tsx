import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/admin/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <header className="topbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search courses, staff, or departments..."
            />
          </div>
          <div className="topbar-right">
            <button className="notif-btn" aria-label="Notifications">
              <span>🔔</span>
              <span className="notif-dot" />
            </button>
            <div className="topbar-profile">
              <div className="topbar-avatar">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="topbar-info">
                <span className="topbar-name">{user?.first_name} {user?.last_name}</span>
                <span className="topbar-role">{user?.role ?? '—'}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
