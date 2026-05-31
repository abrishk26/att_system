import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Sidebar from './Sidebar';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { useDarkMode } from '../../hooks/useDarkMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Layout() {
  const { token, user, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useDarkMode();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/admin/login" replace />;

  const fullName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="hidden flex-1 lg:block" />

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className="flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            </button>

            <NotificationBell />
            <div className="mx-1 hidden h-8 w-px bg-border sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-lg p-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted-foreground">Department head</p>
                    <p className="text-sm font-medium text-foreground">{user.first_name}</p>
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                      {user.first_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium">{fullName}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    @{user.username} · {user.role}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="animate-fade-in flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
