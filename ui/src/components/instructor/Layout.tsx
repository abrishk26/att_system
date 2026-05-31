import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
    BarChart3,
    BookOpen,
    UserCheck,
    LogOut,
    Menu,
    Search,
    ChevronRight,
    ChevronLeft,
    X,
    ShieldCheck,
    FileText,
    Sun,
    Moon
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

export default function InstructorLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDark, setIsDark] = useDarkMode();
    const { user, logout, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate('/instructor/login', { replace: true });
            } else if (user.role !== 'instructor' && user.role !== 'admin') {
                // If student tries to access instructor portal, send them back
                navigate('/student/home', { replace: true });
            }
        }
    }, [user, isLoading, navigate]);

    if (isLoading || !user || (user.role !== 'instructor' && user.role !== 'admin')) return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center transition-colors duration-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    const instructorName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;

    const menuItems = [
        { title: 'Dashboard', icon: BarChart3, path: '/instructor/dashboard' },
        { title: 'My Courses', icon: BookOpen, path: '/instructor/courses' },
        { title: 'Attendance', icon: UserCheck, path: '/instructor/attendance' },
        { title: 'Permissions', icon: ShieldCheck, path: '/instructor/permissions' },
        { title: 'Reports', icon: FileText, path: '/instructor/reports' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex overflow-hidden font-sans transition-colors duration-200 text-slate-900 dark:text-neutral-100">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo & Close Button */}
                    <div className={`p-6 flex items-center border-b border-slate-50 dark:border-neutral-800/60 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                                <UserCheck size={24} />
                            </div>
                            {!isCollapsed && (
                                <div className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                                    <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block leading-tight">Instructor</span>
                                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest text-primary">Management Portal</span>
                                </div>
                            )}
                        </Link>
                        {!isCollapsed && (
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-400 dark:text-neutral-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {!isCollapsed && (
                            <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-4">Main Menu</p>
                        )}
                        {menuItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.title}
                                    to={item.path}
                                    title={isCollapsed ? item.title : ''}
                                    className={`flex items-center rounded-xl transition-all group ${isActive
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-primary dark:hover:text-white'
                                        } ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'group-hover:text-primary dark:group-hover:text-indigo-400'}`} />
                                        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.title}</span>}
                                    </div>
                                    {!isCollapsed && isActive && <ChevronRight size={16} />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Collapse Toggle */}
                    <div className="p-4 mt-auto border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 dark:text-neutral-500 hover:text-primary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl transition-all font-medium text-sm ${isCollapsed ? 'justify-center p-3' : ''}`}
                        >
                            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                            {!isCollapsed && <span>Collapse</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between px-6 shrink-0 z-40 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        <div className="hidden md:flex items-center bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-750 px-3 py-1.5 rounded-xl w-80 focus-within:ring-2 focus-within:ring-primary/10">
                            <Search size={16} className="text-slate-400 dark:text-neutral-500 mr-2" />
                            <input
                                type="text"
                                placeholder="Search courses or results..."
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
                        <div className="h-8 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block mx-1"></div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-3 rounded-lg p-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <div className="hidden text-right sm:block">
                                        <p className="text-xs text-muted-foreground">Instructor</p>
                                        <p className="text-sm font-medium text-foreground">{user.first_name}</p>
                                    </div>
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                                            {user.first_name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="font-medium">{instructorName}</p>
                                    <p className="text-xs text-muted-foreground capitalize">@{user.username} · {user.role}</p>
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

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 transition-colors duration-200">
                    <Outlet context={{ instructorId: user.id }} />
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}
