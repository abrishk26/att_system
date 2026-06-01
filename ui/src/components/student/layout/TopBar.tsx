import React from 'react';
import { Bell, UserCircle, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../../contexts/NotificationsContext';

interface TopBarProps {
  studentName: string;
  studentId?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ studentName }) => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleLogout = () => {
    // Clear auth tokens and redirect to login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--aau-primary)] text-white shadow-md">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-5 py-3 md:px-8 md:py-4">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="items-center justify-center overflow-hidden rounded-full bg-white p-1 h-10 w-10">
            <img
              src="https://www.aau.edu.et/images/aauLogo.png"
              alt="Addis Ababa University logo"
              className="h-full w-full scale-125 object-cover"
            />
          </div>
          <div className="border-l border-white/30 pl-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">Addis Ababa University</p>
            <h2 className="text-sm font-semibold md:text-base">CNCS School of Information Science</h2>
          </div>
        </div>

        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <LayoutDashboard className="h-[18px] w-[18px] text-cyan-200" />
          <p className="text-sm font-semibold tracking-wide text-white/90">Student Dashboard</p>
        </div>

        <div className="hidden text-center md:block">
          <p className="text-[11px] text-white/70">{today}</p>
          <h1 className="text-sm font-semibold">{studentName}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/student/notifications"
            className="relative rounded-lg p-1.5 transition-colors hover:bg-white/10"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[var(--aau-primary)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          </Link>

          <Link
            to="/student/profile"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
            aria-label="Open profile"
          >
            <UserCircle className="h-6 w-6 text-white" />
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};