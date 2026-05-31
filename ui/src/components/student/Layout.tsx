import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
    LayoutDashboard,
    History,
    ShieldAlert,
    LogOut,
    Menu,
    ChevronRight,
    ChevronLeft,
    GraduationCap,
    X,
    Sun,
    Moon,
    Bell,
} from 'lucide-react';
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

export default function StudentLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDark, setIsDark] = useDarkMode();
    const { user, logout, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate('/student/login', { replace: true });
            } else if (user.role !== 'student' && user.role !== 'admin') {
                navigate('/instructor/dashboard', { replace: true });
            }
        }
    }, [user, isLoading, navigate]);

    if (isLoading || !user || (user.role !== 'student' && user.role !== 'admin')) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
        );
    }

    const studentName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;

    const menuItems = [
        { title: 'Dashboard', icon: LayoutDashboard, path: '/student/home' },
        { title: 'Attendance', icon: History, path: '/student/history' },
        { title: 'Requests', icon: ShieldAlert, path: '/student/permissions' },
        { title: 'Notifications', icon: Bell, path: '/student/notifications' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex min-h-screen overflow-hidden bg-background font-sans text-foreground">
            <aside
                className={`fixed inset-y-0 left-0 z-50 transform border-r border-border bg-card transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
            >
                <div className="flex h-full flex-col">
                    <div
                        className={`flex items-center border-b border-border p-6 ${
                            isCollapsed ? 'justify-center' : 'justify-between'
                        }`}
                    >
                        <Link to="/" className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap size={24} />
                            </div>
                            {!isCollapsed && (
                                <div className="whitespace-nowrap">
                                    <span className="block text-lg font-semibold tracking-tight">
                                        Digital Attendance
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                        Student portal
                                    </span>
                                </div>
                            )}
                        </Link>
                        {!isCollapsed && (
                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                        {!isCollapsed && (
                            <p className="mb-4 px-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                Menu
                            </p>
                        )}
                        {menuItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.title}
                                    to={item.path}
                                    title={isCollapsed ? item.title : ''}
                                    className={`flex items-center rounded-xl transition-all ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    } ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} className="shrink-0" />
                                        {!isCollapsed && (
                                            <span className="text-sm font-medium">{item.title}</span>
                                        )}
                                    </div>
                                    {!isCollapsed && isActive && <ChevronRight size={16} />}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-auto border-t border-border bg-muted/30 p-4">
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

            <div className="flex h-screen flex-1 flex-col overflow-hidden">
                <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="hidden flex-1 lg:block" />

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsDark(!isDark)}
                            className="flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted"
                            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? (
                                <Sun size={20} className="text-amber-500" />
                            ) : (
                                <Moon size={20} />
                            )}
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
                                        <p className="text-xs text-muted-foreground">Student</p>
                                        <p className="text-sm font-medium text-foreground">
                                            {user.first_name}
                                        </p>
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
                                    <p className="font-medium">{studentName}</p>
                                    <p className="text-xs capitalize text-muted-foreground">
                                        @{user.username} · {user.role}
                                    </p>
                                </DropdownMenuLabel>
                                {user.nfc_id && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <div className="px-2 py-1.5">
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                NFC card
                                            </p>
                                            <p className="font-mono text-xs text-foreground">
                                                {user.nfc_id}
                                            </p>
                                        </div>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
                    <Outlet context={{ studentId: user.id }} />
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
