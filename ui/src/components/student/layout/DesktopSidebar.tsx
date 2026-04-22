import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, History, FileText, User } from 'lucide-react';

const navItems = [
  { to: '/student/home', icon: Home, label: 'Dashboard Home' },
  { to: '/student/schedule', icon: Calendar, label: 'My Schedule' },
  { to: '/student/history', icon: History, label: 'Attendance History' },
  { to: '/student/permissions', icon: FileText, label: 'Permissions' },
  { to: '/student/profile', icon: User, label: 'Profile' },
];

interface DesktopSidebarProps {
  studentName: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ studentName }) => {
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[var(--aau-primary)] text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden bg-white p-1 rounded-full">
            <img
              src="https://www.aau.edu.et/images/aauLogo.png"
              alt="Addis Ababa University logo"
              className="h-full w-full scale-125 object-cover"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/70">AAU CNCS</p>
            <p className="text-sm font-semibold">Student Portal</p>
          </div>
        </div>
        <p className="text-sm text-white/75">School of Information Science</p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[rgba(0,168,232,0.26)] text-white ring-1 ring-[rgba(0,168,232,0.52)]'
                  : 'text-white/82 hover:bg-white/12 hover:text-cyan-100'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-5">
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--aau-accent)] font-bold text-[var(--aau-primary-dark)]">
            {initials || 'S'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{studentName}</p>
            <p className="text-xs text-white/75">Student Access</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
