import { useState, useEffect } from 'react';
import {
    Plus,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    ChevronRight,
    Search,
    AlertCircle,
    History,
    CalendarDays,
    BookOpen
} from 'lucide-react';
import { api, type PermissionWithStudent } from '../../api';
import { useAuth } from '../../AuthContext';

// Shadcn UI Imports
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

interface Session {
    id: string;
    class_id: string;
    course_id: string;
    instructor_id: string;
    status: 'incoming' | 'ongoing' | 'completed';
    created_at: string;
}

interface AttendanceRecord {
    id: string;
    student_id: string;
    session_id: string;
    status: 'present' | 'absent' | 'excused' | 'late';
    student_name?: string;
}

interface Course {
    id: string;
    name: string;
}

interface ClassDetail {
    id: string;
    year: number;
    section: number;
}

interface Assignment {
    id: string;
    instructor_id: string;
    class_id: string;
    course_id: string;
}

export default function AttendancePage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // New Session Form State
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<ClassDetail[]>([]);
    const [newSession, setNewSession] = useState({ course_id: '', class_id: '' });
    const [sessionDate, setSessionDate] = useState<Date | undefined>(new Date());
    const [showNewForm, setShowNewForm] = useState(false);
    const [viewingPermission, setViewingPermission] = useState<PermissionWithStudent | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [sessionsData, assignmentsData] = await Promise.all([
                api.request<Session[]>('/sessions/instructor'),
                api.request<Assignment[]>('/instructor/assignments'),
            ]);

            setSessions(sessionsData.sort((a: Session, b: Session) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
            setAssignments(assignmentsData);

            // Extract courses and classes from assignments
            const uniqueCourseIds = Array.from(new Set(assignmentsData.map((a: Assignment) => a.course_id)));
            const uniqueClassIds = Array.from(new Set(assignmentsData.map((a: Assignment) => a.class_id)));

            // Fetch course and class details sequentially or with allSettled to be more robust
            const coursesResults = await Promise.allSettled(uniqueCourseIds.map(id => api.request<Course>(`/course/${id}`)));
            const classesResults = await Promise.allSettled(uniqueClassIds.map(id => api.request<ClassDetail>(`/class/${id}`)));

            const successfulCourses = coursesResults
                .filter((r): r is PromiseFulfilledResult<Course> => r.status === 'fulfilled')
                .map(r => r.value);

            const successfulClasses = classesResults
                .filter((r): r is PromiseFulfilledResult<ClassDetail> => r.status === 'fulfilled')
                .map(r => r.value);

            setCourses(successfulCourses);
            setClasses(successfulClasses);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter classes based on selected course
    const availableClasses = newSession.course_id
        ? classes.filter(cls =>
            assignments.some(a => a.course_id === newSession.course_id && a.class_id === cls.id)
        )
        : [];

    const handleCreateSession = async () => {
        if (!newSession.course_id || !newSession.class_id) return;

        setActionLoading(true);
        try {
            const session: Session = await api.request('/session/create', {
                method: 'POST',
                body: JSON.stringify({
                    instructor_id: user?.id,
                    ...newSession
                })
            });

            await api.request('/record/create', {
                method: 'POST',
                body: JSON.stringify({ session_id: session.id })
            });

            const mockSession = { ...session, created_at: sessionDate?.toISOString() || new Date().toISOString() };

            setSessions([mockSession, ...sessions]);
            setShowNewForm(false);
            setNewSession({ course_id: '', class_id: '' });
        } catch (error) {
            console.error("Failed to create session:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelectSession = async (session: Session) => {
        setSelectedSession(session);
        setLoading(true);
        try {
            const recordsData: AttendanceRecord[] = await api.request(`/record/${session.id}`);
            setRecords(recordsData);
        } catch (error) {
            console.error("Failed to fetch records:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (recordId: string, status: string) => {
        try {
            await api.request('/record/update', {
                method: 'PATCH',
                body: JSON.stringify({
                    session_id: selectedSession?.id,
                    nfc_id: records.find(r => r.id === recordId)?.student_id,
                    status: status
                })
            });

            setRecords(records.map(r => r.id === recordId ? { ...r, status: status as any } : r));
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleUpdatePermission = async (id: string, status: 'accepted' | 'rejected') => {
        try {
            await api.updatePermission(id, status);
            // Refresh permissions
            // (Removed permission refresh from here as the tab is gone)
            if (viewingPermission?.id === id) {
                setViewingPermission(prev => prev ? ({ ...prev, status } as PermissionWithStudent) : null);
            }
        } catch (error) {
            console.error("Failed to update permission:", error);
        }
    };

    if (loading && !selectedSession) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
                    <p className="text-slate-500 mt-1 font-medium">Track and manage student presence in your sessions</p>
                </div>

                <Button
                    onClick={() => setShowNewForm(true)}
                    className="flex items-center gap-2 bg-primary text-white h-13 px-8 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.03] active:scale-[0.98] transition-all"
                >
                    <Plus size={20} />
                    Start New Session
                </Button>
            </div>

            {/* Selection/View Layer */}
            {!selectedSession ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {sessions.length} total sessions
                        </div>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-[40px] p-24 text-center shadow-sm">
                            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 animate-pulse">
                                <History className="text-slate-300" size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">No sessions yet</h3>
                            <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">Start your first attendance session to begin tracking student presence in real-time.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sessions.map((session) => {
                                const course = courses.find(c => c.id === session.course_id);
                                const classDetail = classes.find(c => c.id === session.class_id);

                                return (
                                    <Card
                                        key={session.id}
                                        onClick={() => handleSelectSession(session)}
                                        className="group cursor-pointer border-slate-100 hover:border-primary/30 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 rounded-[32px] overflow-hidden"
                                    >
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between">
                                                <div className={`p-3 rounded-2xl transition-colors ${session.status === 'ongoing' ? 'bg-emerald-50 text-emerald-600' :
                                                    session.status === 'completed' ? 'bg-slate-50 text-slate-600' : 'bg-primary/5 text-primary'
                                                    }`}>
                                                    <Users size={20} />
                                                </div>
                                                <Badge variant="secondary" className={`text-[10px] uppercase tracking-widest ${session.status === 'ongoing' ? 'bg-emerald-100/50 text-emerald-700' :
                                                    session.status === 'completed' ? 'bg-slate-100/50 text-slate-600' : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    {session.status}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-xl font-bold mt-4 line-clamp-1 group-hover:text-primary transition-colors">
                                                {course?.name || 'Loading Course...'}
                                            </CardTitle>
                                            <CardDescription className="font-semibold text-slate-400">
                                                Class: {classDetail ? `Year ${classDetail.year} - Section ${classDetail.section}` : '...'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Separator className="mb-4 bg-slate-50" />
                                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarDays size={14} />
                                                    {new Date(session.created_at || Date.now()).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} />
                                                    {new Date(session.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSelectedSession(null)}
                            className="flex items-center gap-2.5 text-slate-400 hover:text-primary font-bold transition-all hover:-translate-x-1"
                        >
                            <ChevronRight size={22} className="rotate-180" />
                            Back to Sessions
                        </button>
                        <div className="flex items-center gap-3">
                            <span className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedSession.status === 'ongoing' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {selectedSession.status}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
                        <div className="p-8 md:p-10 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {courses.find(c => c.id === selectedSession.course_id)?.name}
                                </h2>
                                <p className="text-slate-500 font-bold mt-1">Class: {classes.find(c => c.id === selectedSession.class_id) ? `Year ${classes.find(c => c.id === selectedSession.class_id)?.year} - Section ${classes.find(c => c.id === selectedSession.class_id)?.section}` : '...'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right mr-6 hidden md:block">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Attendance Rate</p>
                                    <p className="text-3xl font-bold text-emerald-600 tracking-tighter">
                                        {Math.round((records.filter(r => r.status === 'present').length / (records.length || 1)) * 100)}%
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-primary shadow-sm hover:scale-105 transition-transform">
                                    <Users size={28} />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div className="relative flex-1 max-w-md group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                                    <Input
                                        placeholder="Search student by name..."
                                        className="pl-12 h-12 bg-slate-100 border-none rounded-2xl text-sm font-bold focus-visible:ring-primary/10"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span className="text-[11px] font-bold text-slate-600">{records.filter(r => r.status === 'present').length} Present</span>
                                    </div>
                                    <button className="p-3.5 rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"><Filter size={20} /></button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-3xl border border-slate-100">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                            <th className="px-6 py-5 border-b border-slate-100">Student Name</th>
                                            <th className="px-6 py-5 border-b border-slate-100">Active Status</th>
                                            <th className="px-6 py-5 border-b border-slate-100 text-right">Quick Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {records.map((record) => (
                                            <tr key={record.id} className="group hover:bg-slate-50/30 transition-all">
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black shrink-0 transition-colors group-hover:bg-primary/5 group-hover:text-primary">
                                                            {record.student_name?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{record.student_name || 'Unknown Student'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                                        record.status === 'absent' ? 'bg-rose-100 text-rose-700' :
                                                            record.status === 'excused' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full shadow-sm ${record.status === 'present' ? 'bg-emerald-500' :
                                                            record.status === 'absent' ? 'bg-rose-500' :
                                                                record.status === 'excused' ? 'bg-blue-500' : 'bg-amber-500'
                                                            }`}></span>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            onClick={() => handleUpdateStatus(record.id, 'present')}
                                                            disabled={record.status === 'present'}
                                                            className={`p-3 rounded-xl transition-all ${record.status === 'present' ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500/10' : 'bg-white border border-slate-200 text-slate-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 hover:scale-110'}`}
                                                            title="Mark Present"
                                                        >
                                                            <CheckCircle2 size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(record.id, 'excused')}
                                                            disabled={record.status === 'excused'}
                                                            className={`p-3 rounded-xl transition-all ${record.status === 'excused' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500/10' : 'bg-white border border-slate-200 text-slate-300 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-100/30 hover:scale-110'}`}
                                                            title="Mark Excused"
                                                        >
                                                            <Clock size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(record.id, 'absent')}
                                                            disabled={record.status === 'absent'}
                                                            className={`p-3 rounded-xl transition-all ${record.status === 'absent' ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-500/10' : 'bg-white border border-slate-200 text-slate-300 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 hover:scale-110'}`}
                                                            title="Mark Absent"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>

                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Session Dialog */}
            <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
                <DialogContent className="sm:max-w-xl p-0 border-none rounded-[40px] overflow-hidden bg-white shadow-2xl">
                    <div className="relative">
                        <div className="bg-slate-900 px-10 py-12 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <DialogHeader>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10">
                                            <Plus size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-3xl font-black tracking-tight text-white">New Session</DialogTitle>
                                            <DialogDescription className="text-slate-400 text-base font-medium">
                                                Initialize a new attendance tracking session.
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>
                            </div>
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full translate-x-20 -translate-y-20 blur-3xl"></div>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Course Selection */}
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <BookOpen size={14} className="text-primary" />
                                        Course
                                    </Label>
                                    <Select
                                        value={newSession.course_id}
                                        onValueChange={(v) => {
                                            setNewSession({ ...newSession, course_id: v, class_id: '' });
                                        }}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:ring-primary/10 hover:bg-slate-100 transition-all font-bold px-5">
                                            <SelectValue placeholder="Select course..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                                            {courses.length === 0 ? (
                                                <div className="py-6 px-4 text-center">
                                                    <p className="text-xs font-bold text-slate-400">No courses assigned.</p>
                                                </div>
                                            ) : (
                                                courses.map(course => (
                                                    <SelectItem key={course.id} value={course.id} className="py-3 px-4 rounded-xl focus:bg-primary/5 transition-colors cursor-pointer font-medium">
                                                        {course.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Class Selection */}
                                <div className="space-y-3">
                                    <Label className={`text-[11px] font-black uppercase tracking-widest ml-1 flex items-center gap-2 transition-colors ${!newSession.course_id ? 'text-slate-300' : 'text-slate-400'}`}>
                                        <Users size={14} className={newSession.course_id ? "text-primary" : "text-slate-300"} />
                                        Class
                                    </Label>
                                    <Select
                                        value={newSession.class_id}
                                        disabled={!newSession.course_id}
                                        onValueChange={(v) => setNewSession({ ...newSession, class_id: v })}
                                    >
                                        <SelectTrigger className={`h-14 rounded-2xl border-slate-100 focus:ring-primary/10 transition-all font-bold px-5 ${!newSession.course_id ? 'bg-slate-50/50 opacity-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                            <SelectValue placeholder={!newSession.course_id ? "Pick course first" : "Select class..."} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                                            {availableClasses.map(cls => (
                                                <SelectItem key={cls.id} value={cls.id} className="py-3 px-4 rounded-xl focus:bg-primary/5 transition-colors cursor-pointer font-medium">
                                                    Year {cls.year} - Section {cls.section}
                                                </SelectItem>
                                            ))}
                                            {newSession.course_id && availableClasses.length === 0 && (
                                                <div className="py-6 px-4 text-center">
                                                    <p className="text-xs font-bold text-slate-400">No classes for this course.</p>
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <CalendarDays size={14} className="text-primary" />
                                    Starting Time
                                </Label>
                                <DateTimePicker date={sessionDate} setDate={setSessionDate} />
                            </div>

                            <Separator className="bg-slate-100" />

                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                        <AlertCircle size={20} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold leading-tight">
                                        All students will be initialized as <span className="text-rose-500">Absent</span> until they scan.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleCreateSession}
                                    disabled={!newSession.course_id || !newSession.class_id || actionLoading}
                                    className="h-14 bg-primary text-white font-bold px-8 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 shrink-0"
                                >
                                    {actionLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : "Start Session"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Permission Details Dialog */}
            <Dialog open={!!viewingPermission} onOpenChange={(open) => !open && setViewingPermission(null)}>
                <DialogContent className="sm:max-w-md p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
                    {viewingPermission && (
                        <div>
                            <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden">
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10">
                                        <AlertCircle size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold tracking-tight text-white">Permission Request</DialogTitle>
                                        <p className="text-slate-400 text-xs font-medium">From {viewingPermission.student_name}</p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full translate-x-10 -translate-y-10 blur-2xl"></div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Absence</p>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-800 leading-relaxed min-h-[100px]">
                                        {viewingPermission.description}
                                    </div>
                                </div>

                                {viewingPermission.img_url && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attachment</p>
                                        <div className="rounded-2xl border border-slate-100 overflow-hidden group">
                                            <img
                                                src={`http://127.0.0.1:3001/${viewingPermission.img_url}`}
                                                alt="Permission evidence"
                                                className="w-full object-cover max-h-64 hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                                                onClick={() => window.open(`http://127.0.0.1:3001/${viewingPermission.img_url}`, '_blank')}
                                            />
                                        </div>
                                    </div>
                                )}

                                <Separator className="bg-slate-100" />

                                <div className="flex items-center justify-between gap-4">
                                    <Badge className={`px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px] ${viewingPermission.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        viewingPermission.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                            'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                        {viewingPermission.status}
                                    </Badge>

                                    {viewingPermission.status === 'pending' ? (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="rounded-xl border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-bold"
                                                onClick={() => handleUpdatePermission(viewingPermission.id, 'rejected')}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold px-6"
                                                onClick={() => handleUpdatePermission(viewingPermission.id, 'accepted')}
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            className="text-slate-400 font-bold"
                                            onClick={() => setViewingPermission(null)}
                                        >
                                            Close
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Minimal Filter icon
function Filter({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
    )
}
