import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-header">
          <div className="landing-logo">🎓</div>
          <h1 className="landing-title">Smart Campus</h1>
          <p className="landing-subtitle">Attendance Management System</p>
        </div>

        <div className="landing-cards">
          <button 
            className="role-card admin-card" 
            onClick={() => navigate('/admin/login')}
          >
            <div className="role-icon">👨‍💼</div>
            <h2 className="role-title">Admin Dashboard</h2>
            <p className="role-description">
              Manage sessions, track attendance, and generate reports
            </p>
            <div className="role-arrow">→</div>
          </button>

          <button 
            className="role-card student-card" 
            onClick={() => navigate('/student/login')}
          >
            <div className="role-icon">👨‍🎓</div>
            <h2 className="role-title">Student Dashboard</h2>
            <p className="role-description">
              View your schedule, attendance history, and submit permissions
            </p>
            <div className="role-arrow">→</div>
          </button>
        </div>

        <footer className="landing-footer">
          <p>© 2026 Smart Campus. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
