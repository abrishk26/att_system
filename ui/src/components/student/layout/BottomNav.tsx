import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, History, FileText, User } from 'lucide-react';

const navItems = [
  { to: '/student/home', icon: Home, label: 'Home' },
  { to: '/student/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/student/history', icon: History, label: 'History' },
  { to: '/student/permissions', icon: FileText, label: 'Permissions' },
  { to: '/student/profile', icon: User, label: 'Profile' },
];

export const BottomNav: React.FC = () => {
  const activeLinkStyle = 'text-white bg-[rgba(0,168,232,0.24)] ring-1 ring-[rgba(0,168,232,0.5)]';
  const inactiveLinkStyle = 'text-white hover:text-white hover:bg-white/12';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[var(--aau-primary)]/98 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1280px] items-center justify-around px-2 pb-1 pt-1.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex w-full flex-col items-center justify-center rounded-xl px-2 py-1.5 text-xs font-semibold transition-all ${isActive ? activeLinkStyle : inactiveLinkStyle}`
            }
          >
            <Icon className="h-5 w-5 text-white" />
            <span className="mt-1 text-[11px] text-white">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
