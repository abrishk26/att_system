import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Sidebar from './Sidebar';
import { Menu, Search, LogOut, Sun, Moon } from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { useDarkMode } from '../../hooks/useDarkMode';

export default function Layout() {
  const { token, user, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDark, setIsDark] = useDarkMode();
  const navigate = useNavigate();

  if (isLoading)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center transition-colors duration-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  if (!token || !user) return <Navigate to="/admin/login" replace />;

  const fullName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex overflow-hidden transition-colors duration-200">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0 z-40 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:flex items-center bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 px-3 py-1.5 rounded-xl w-80 transition-all focus-within:ring-2 focus-within:ring-primary/10">
              <Search size={16} className="text-slate-400 dark:text-neutral-500 mr-2" />
              <input
                type="text"
                placeholder="Search staff, students, or reports..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-300 w-full placeholder:text-slate-400 dark:placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            </button>

            <NotificationBell />
            <div className="h-8 w-px bg-slate-100 dark:bg-neutral-800 hidden sm:block mx-1" />

            {/* User profile dropdown — same pattern as instructor/student */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen((o) => !o)}
                className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-855 transition-all group"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
                    Administrator
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {user.first_name}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 dark:shadow-none ring-2 ring-white dark:ring-neutral-800 group-hover:scale-105 transition-transform">
                  {user.first_name?.charAt(0)}
                </div>
              </button>

              {isProfileOpen && (
                <>
                  {/* Click-outside backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-neutral-800 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                    {/* Profile header */}
                    <div className="px-5 py-4 border-b border-slate-50 dark:border-neutral-850 bg-slate-50/30 dark:bg-neutral-950/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg">
                          {user.first_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-900 dark:text-white truncate">{fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-neutral-450 font-medium truncate capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest">
                          Username
                        </span>
                        <span className="text-xs font-bold text-primary dark:text-cyan-400 bg-primary/5 dark:bg-cyan-550/15 px-2 py-0.5 rounded-lg border border-primary/10 dark:border-cyan-500/20">
                          @{user.username}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all font-bold text-sm group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950 text-red-500 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-950/50 transition-colors">
                          <LogOut size={18} />
                        </div>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
