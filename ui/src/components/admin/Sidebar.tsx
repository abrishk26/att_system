import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Shield,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/staff', icon: Users, label: 'Staff Management' },
  { to: '/admin/schedule', icon: Calendar, label: 'Class Schedule' },
];

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
      >
        <div className="h-full flex flex-col">
          {/* Brand Logo */}
          <div
            className={`p-6 flex items-center border-b border-slate-50 dark:border-neutral-800/60 ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                <Shield size={22} />
              </div>
              {!isCollapsed && (
                <div className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                  <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block leading-tight">
                    Smart Campus
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest text-primary">
                    Admin Panel
                  </span>
                </div>
              )}
            </Link>
            {!isCollapsed && (
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-400 dark:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {!isCollapsed && (
              <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-4">
                Main Menu
              </p>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : ''}
                className={({ isActive }) => `
                  flex items-center rounded-xl transition-all group
                  ${
                    isActive
                      ? 'bg-slate-900 dark:bg-primary text-white shadow-lg shadow-slate-200 dark:shadow-none'
                      : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-primary dark:hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium whitespace-nowrap">{item.label}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer — collapse toggle only */}
          <div className="p-4 mt-auto border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 dark:text-neutral-500 hover:text-primary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl transition-all font-medium text-sm ${
                isCollapsed ? 'justify-center p-3' : ''
              }`}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
