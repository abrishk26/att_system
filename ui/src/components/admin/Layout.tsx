import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Sidebar from './Sidebar';
import {
  Menu,
  Search,
  LogOut
} from 'lucide-react';
import { NotificationBell } from '../NotificationBell';

export default function Layout() {
  const { token, user, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!token || !user) return <Navigate to="/admin/login" replace />;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-80 transition-all focus-within:ring-2 focus-within:ring-primary/10">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search staff, students, or reports..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1"></div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Administrator</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  {user?.first_name}
                </p>
              </div>

              <div className="relative group">
                <button className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 ring-2 ring-white">
                    {user?.first_name?.charAt(0)}
                  </div>
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
