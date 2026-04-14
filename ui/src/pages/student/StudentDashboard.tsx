import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TopBar } from '../../components/student/layout/TopBar';
import { BottomNav } from '../../components/student/layout/BottomNav';
import { DesktopSidebar } from '../../components/student/layout/DesktopSidebar';
import { fetcher } from '../../lib/api/fetcher';

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string | null;
  role: string;
  img_url: string | null;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const data = await fetcher<UserProfile>('/profile');

        if (data.role !== 'student') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          navigate('/login');
          return;
        }

        setProfile(data);
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [token, navigate]);

  useEffect(() => {
    // Redirect from base /student to /student/home
    if (location.pathname === '/student' || location.pathname === '/student/') {
        navigate('/student/home', { replace: true });
    }
  }, [navigate, location.pathname]);

  if (!token || isLoading || !profile) {
    return null; // Or a global loading spinner
  }

  const fullName = `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`;

  return (
    <div className="min-h-screen bg-[var(--aau-bg)] text-[var(--aau-text)]">
      <div className="min-h-screen flex flex-col">
        <TopBar studentName={fullName} studentId={profile.id} />
        <div className="flex flex-1">
          <DesktopSidebar studentName={fullName} />
          <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
            <Outlet context={{ studentId: profile.id }} />
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
};

export default StudentDashboard;
