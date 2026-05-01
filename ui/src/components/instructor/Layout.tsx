import { useState } from 'react';
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
    ShieldCheck
} from 'lucide-react';

export default function InstructorLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const instructorName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`;

    const menuItems = [
        { title: 'Dashboard', icon: BarChart3, path: '/instructor/dashboard' },
        { title: 'My Courses', icon: BookOpen, path: '/instructor/courses' },
        { title: 'Attendance', icon: UserCheck, path: '/instructor/attendance' },
        { title: 'Permissions', icon: ShieldCheck, path: '/instructor/permissions' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isCollapsed ? 'w-20 lg:w-20' : 'w-72 lg:w-72'}`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo & Close Button */}
                    <div className={`p-6 flex items-center border-b border-slate-50 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                                <UserCheck size={24} />
                            </div>
                            {!isCollapsed && (
                                <div className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                                    <span className="font-bold text-lg tracking-tight text-slate-900 block leading-tight">Instructor</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-primary">Management Portal</span>
                                </div>
                            )}
                        </Link>
                        {!isCollapsed && (
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {!isCollapsed && (
                            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Main Menu</p>
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
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                                        } ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'group-hover:text-primary'}`} />
                                        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.title}</span>}
                                    </div>
                                    {!isCollapsed && isActive && <ChevronRight size={16} />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Collapse Toggle */}
                    <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl transition-all font-medium text-sm ${isCollapsed ? 'justify-center p-3' : ''}`}
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
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        <div className="hidden md:flex items-center bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl w-80 focus-within:ring-2 focus-within:ring-primary/10">
                            <Search size={16} className="text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search courses or results..."
                                className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>

                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-all group"
                            >
                                <div className="hidden sm:block text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mb-1">Instructor</p>
                                    <p className="text-sm font-bold text-slate-900 leading-none">{user.first_name}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                                    {user.first_name?.charAt(0)}
                                </div>
                            </button>

                            {/* Profile Popover */}
                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                                                    {user.first_name?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-slate-900 truncate">{instructorName}</p>
                                                    <p className="text-xs text-slate-500 font-medium truncate capitalize">{user.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</span>
                                                <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                                                    @{user.username}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-2">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100 transition-colors">
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
                <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-slate-50">
                    <Outlet context={{ instructorId: user.id }} />
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
