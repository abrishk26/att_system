import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Assignment, Session } from '../../api';
import { useAuth } from '../../AuthContext';
import {
    Users,
    BookOpen,
    Activity,
    Calendar,
    Plus,
    ArrowRight,
    MoreVertical,
    Clock
} from 'lucide-react';

export default function InstructorDashboard() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [assigns, sess] = await Promise.all([
                    api.instructorAssignments(),
                    api.instructorSessions()
                ]);
                setAssignments(assigns);
                setSessions(sess.slice(0, 5)); // Keep only recent sessions
            } catch (err) {
                console.error('Failed to load dashboard data', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    const stats = [
        { title: 'Active Courses', value: assignments.length, icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
        { title: 'Total Sessions', value: sessions.length, icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
        { title: 'Avg. Attendance', value: '84%', icon: Activity, color: 'bg-amber-50 text-amber-600' },
        { title: 'Students', value: '124', icon: Users, color: 'bg-rose-50 text-rose-600' },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                    Hello, Prof. {user?.first_name}! 👋
                </h1>
                <p className="text-slate-500">Here's what's happening with your classes today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="glass p-6 rounded-3xl transition-all duration-300 card-hover bg-white/50 border-white">
                        <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center mb-4 shadow-sm`}>
                            <stat.icon size={24} />
                        </div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Sessions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Clock className="text-primary" size={20} />
                            Recent Sessions
                        </h2>
                        <button className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                            View All <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {sessions.length > 0 ? sessions.map((session) => (
                            <div key={session.id} className="glass p-5 rounded-2xl bg-white border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.status === 'active' ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-50 text-slate-400'
                                        }`}>
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{session.course_id}</h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            Class ID: {session.class_id} • Status: <span className="capitalize font-medium">{session.status}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-slate-400">No recent sessions found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Courses */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="text-primary" size={20} />
                        My Courses
                    </h2>
                    <div className="space-y-3">
                        {assignments.map((assign) => (
                            <div key={assign.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-primary/30 transition-all cursor-pointer group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{assign.course_id}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Section {assign.class_id}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[8px] flex items-center justify-center font-bold text-slate-600">
                                                {i}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">+42 more students</p>
                                </div>
                            </div>
                        ))}

                        <button className="w-full mt-4 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary/50 hover:text-primary transition-all font-semibold">
                            <Plus size={18} />
                            <span>Start New Session</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Minimal icons for internal use
function ChevronRight({ size = 16 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}
