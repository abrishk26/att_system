import { NavLink } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/admin/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/admin/analytics', icon: '📈', label: 'Analytics' },
  { to: '/admin/reports', icon: '📄', label: 'Reports' },
  { to: '/admin/staff', icon: '👥', label: 'Staff Management' },
  { to: '/admin/schedule', icon: '📅', label: 'Class Schedule' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-wrap">🎓</div>
        <div>
          <div className="brand-name">Smart Campus</div>
          <div className="brand-role">Admin Dashboard</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/admin/settings"
          className={({ isActive }) => `nav-item settings-btn${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </NavLink>

        {/* Keep logout accessible without cluttering the sidebar with extra icons */}
        <button className="nav-item settings-btn" onClick={logout} style={{ marginTop: 8 }}>
          <span className="nav-icon">⇦</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
