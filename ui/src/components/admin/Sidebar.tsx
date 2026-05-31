import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  ChevronRight,
  ChevronLeft,
  Shield,
  X,
  ClipboardList,
  ShieldCheck,
  CalendarDays,
  Sheet,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

type NavItem = { to: string; icon: typeof LayoutDashboard; label: string };

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/sessions', icon: ClipboardList, label: 'Sessions' },
      { to: '/admin/schedule', icon: CalendarDays, label: 'Class schedule' },
      { to: '/admin/permissions', icon: ShieldCheck, label: 'Permissions' },
      { to: '/admin/staff', icon: Users, label: 'Staff' },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { to: '/admin/reports', icon: FileText, label: 'Report center' },
      { to: '/admin/reports/student-attendance', icon: Sheet, label: 'Student roster' },
      { to: '/admin/reports/course-attendance', icon: Sheet, label: 'Course roster' },
    ],
  },
];

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-card transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
    >
      <div className="flex h-full flex-col">
        <div
          className={`flex items-center border-b border-border p-6 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Shield size={22} />
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap">
                <span className="block text-lg font-bold leading-tight tracking-tight text-foreground">
                  Digital Attendance
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Department head
                </span>
              </div>
            )}
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin/dashboard'}
                    title={isCollapsed ? item.label : ''}
                    className={({ isActive }) =>
                      `group flex items-center rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      } ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-2.5'}`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className="shrink-0" />
                      {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronRight
                        size={14}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground ${
              isCollapsed ? 'justify-center p-3' : ''
            }`}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
