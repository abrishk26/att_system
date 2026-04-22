import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Shield,
  X
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
  const { logout } = useAuth();

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
      >
        <div className="h-full flex flex-col">
          {/* Brand Logo */}
          <div className={`p-6 flex items-center border-b border-slate-50 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                <Shield size={22} />
              </div>
              {!isCollapsed && (
                <div className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                  <span className="font-bold text-lg tracking-tight text-slate-900 block leading-tight">Smart Campus</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-primary">Admin Panel</span>
                </div>
              )}
            </Link>
            {!isCollapsed && (
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {!isCollapsed && (
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Main Menu</p>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : ''}
                className={({ isActive }) => `
                  flex items-center rounded-xl transition-all group
                  ${isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}
                  ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="shrink-0" />
                  {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                </div>
                {!isCollapsed && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
              </NavLink>
            ))}
          </nav>

          {/* Footer Navigation */}
          <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
            <NavLink
              to="/admin/settings"
              title={isCollapsed ? 'Settings' : ''}
              className={({ isActive }) => `
                flex items-center rounded-xl transition-all mb-2
                ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-white hover:text-primary shadow-sm'}
                ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}
              `}
            >
              <Settings size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">Settings</span>}
            </NavLink>

            {!isCollapsed && (
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm mb-4"
              >
                <LogOut size={20} className="shrink-0" />
                <span>Log out</span>
              </button>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-all font-medium text-sm ${isCollapsed ? 'justify-center p-3' : ''}`}
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
