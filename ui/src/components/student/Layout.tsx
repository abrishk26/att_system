import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
    LayoutDashboard,
    History,
    ShieldAlert,
    LogOut,
    Menu,
    Search,
    ChevronRight,
    ChevronLeft,
    GraduationCap,
    X,
    Sun,
    Moon
} from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { useDarkMode } from '../../hooks/useDarkMode';

export default function StudentLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDark, setIsDark] = useDarkMode();
    const { user, logout, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                navigate('/student/login', { replace: true });
            } else if (user.role !== 'student' && user.role !== 'admin') {
                // If instructor tries to access student portal, send them back
                navigate('/instructor/dashboard', { replace: true });
            }
        }
    }, [user, isLoading, navigate]);

    if (isLoading || !user || (user.role !== 'student' && user.role !== 'admin')) return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center transition-colors duration-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    const studentName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;

    const menuItems = [
        { title: 'Dashboard', icon: LayoutDashboard, path: '/student/home' },
        { title: 'Attendance', icon: History, path: '/student/history' },
        { title: 'Requests', icon: ShieldAlert, path: '/student/permissions' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-neutral-100 flex overflow-hidden font-sans transition-colors duration-200">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
            >
                <div className="h-full flex flex-col">
                    {/* Brand & Close Button */}
                    <div className={`p-6 flex items-center border-b border-slate-50 dark:border-neutral-850 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                                <GraduationCap size={24} />
                            </div>
                            {!isCollapsed && (
                                <div className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                                    <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block leading-tight">Smart Campus</span>
                                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-bold uppercase tracking-widest text-primary">Student Portal</span>
                                </div>
                            )}
                        </Link>
                        {!isCollapsed && (
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {!isCollapsed && (
                            <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-neutral-550 uppercase tracking-widest mb-4">Main Menu</p>
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
                    <div className="p-4 mt-auto border-t border-slate-100 dark:border-neutral-850 bg-slate-50/50 dark:bg-neutral-950/20">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-xl transition-all font-medium text-sm ${isCollapsed ? 'justify-center p-3' : ''}`}
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
                                className="bg-transparent border-none outline-none text-sm text-slate-600 dark:text-white w-full placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center"
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDark ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
                        </button>

                        <NotificationBell />
                        <div className="h-8 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block mx-1"></div>
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all group"
                            >
                                <div className="hidden sm:block text-right">
                                    <p className="text-[10px] text-slate-400 dark:text-neutral-550 font-bold uppercase tracking-tight leading-none mb-1">Student</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user.first_name}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                                    {user.first_name?.charAt(0)}
                                </div>
                            </button>

                            {/* Minimal Profile Modal/Popover */}
                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-neutral-800 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-50 dark:border-neutral-850 bg-slate-50/30 dark:bg-neutral-950/20">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                                                    {user.first_name?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-slate-900 dark:text-white truncate">{studentName}</p>
                                                    <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium truncate">{user.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 shadow-sm">
                                                <span className="text-[10px] font-black text-slate-400 dark:text-neutral-500 uppercase tracking-widest">NFC ID</span>
                                                <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                                                    {user.nfc_id || 'NOT_LINKED'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-2">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-neutral-450 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all font-bold text-sm"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950 text-red-500 flex items-center justify-center group-hover:bg-red-100 transition-colors">
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

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-slate-50 dark:bg-black transition-colors duration-200">
                    <Outlet context={{ studentId: user.id }} />
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
