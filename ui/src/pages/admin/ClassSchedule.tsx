import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { AttendanceRecordWithStudent, Class, Course, Session } from '../../api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Calendar, Clock, Users, Loader2, BookOpen, Activity } from 'lucide-react';
import './ClassSchedule.css';

type ViewMode = 'day' | 'week';
type StatusFilter = 'all' | 'upcoming' | 'inprogress' | 'completed';

function isCompletedStatus(status: string) {
  return status === 'finished' || status === 'completed';
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-3)}` : id;
}

function attendanceStatsFromRecords(records: AttendanceRecordWithStudent[]) {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, attendancePct };
}



type ScheduleItem = {
  session_id: string;
  instructor_id: string;
  courseName: string;
  courseCode: string;
  classLabel: string;
  status: string;
  progressPercent: number | null;
};

export default function ClassSchedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessions = await api.allSessions();

        const maxFetch = viewMode === 'day' ? 18 : 30;
        const sorted = [...sessions].sort((a, b) => {
          const prio = (s: Session) => (s.status === 'active' ? 0 : s.status === 'incoming' ? 1 : 2);
          return prio(a) - prio(b);
        });
        const slice = sorted.slice(0, maxFetch);

        const courseIds = Array.from(new Set(slice.map(s => s.course_id)));
        const classIds = Array.from(new Set(slice.map(s => s.class_id)));

        const coursesById = new Map<string, Course>();
        const classesById = new Map<string, Class>();

        await Promise.all(
          courseIds.map(async id => {
            try {
              const c = await api.courseDetails(id);
              coursesById.set(id, c);
            } catch {
              // Ignore per-item failures.
            }
          })
        );

        await Promise.all(
          classIds.map(async id => {
            try {
              const cl = await api.classDetails(id);
              classesById.set(id, cl);
            } catch {
              // Ignore per-item failures.
            }
          })
        );

        const recordsBySession = await Promise.all(
          slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
        );

        const next: ScheduleItem[] = slice.map((s, i) => {
          const recs = recordsBySession[i];
          const st = attendanceStatsFromRecords(recs);
          const course = coursesById.get(s.course_id);
          const cls = classesById.get(s.class_id);
          return {
            session_id: s.id,
            instructor_id: s.instructor_id,
            courseName: course?.name ?? s.course_id,
            courseCode: course?.course_id ?? s.course_id.substring(0, 8),
            classLabel: cls ? `Year ${cls.year} · Section ${cls.section}` : '',
            status: s.status,
            progressPercent: recs.length > 0 ? st.attendancePct : null,
          };
        });

        if (mounted) setItems(next);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load class schedule');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [viewMode]);

  const visible = useMemo(() => {
    return items.filter(it => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'upcoming') return it.status === 'incoming';
      if (statusFilter === 'inprogress') return it.status === 'active';
      if (statusFilter === 'completed') return isCompletedStatus(it.status);
      return true;
    });
  }, [items, statusFilter]);

  const allSessionsCounts = useMemo(() => {
    const total = items.length;
    const inprogress = items.filter(i => i.status === 'active').length;
    const upcoming = items.filter(i => i.status === 'incoming').length;
    const completed = items.filter(i => isCompletedStatus(i.status)).length;
    return { total, inprogress, upcoming, completed };
  }, [items]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500">In Progress</Badge>;
      case 'incoming': return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Upcoming</Badge>;
      case 'completed':
      case 'finished': return <Badge variant="outline" className="text-slate-400">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Class Schedule</h1>
          <p className="text-slate-500 font-medium mt-1">Institutional timetable and session tracking</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center">
            <button 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>

          <select 
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All Sessions</option>
            <option value="upcoming">Upcoming</option>
            <option value="inprogress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="text-slate-500 font-medium">Loading schedule...</span>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold">
            ⚠ {error}
        </div>
      ) : (
        <Card className="border-slate-50 shadow-md overflow-hidden rounded-[2.5rem]">
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="px-8 font-bold text-slate-500">Course & Class</TableHead>
                            <TableHead className="font-bold text-slate-500">Instructor</TableHead>
                            <TableHead className="text-center font-bold text-slate-500">Status</TableHead>
                            <TableHead className="text-right px-8 font-bold text-slate-500">Attendance Rate</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visible.map((it) => (
                            <TableRow key={it.session_id} className="hover:bg-slate-50/50 transition-colors h-20">
                                <TableCell className="px-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <BookOpen size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 leading-tight">{it.courseName}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{it.courseCode}</span>
                                                <span className="text-slate-300 text-[10px]">•</span>
                                                <span className="text-xs font-bold text-slate-400">{it.classLabel}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Users size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium">Instructor {shortId(it.instructor_id)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {getStatusBadge(it.status)}
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-lg font-black ${it.progressPercent === null ? 'text-slate-200' : it.progressPercent < 75 ? 'text-rose-500' : 'text-indigo-600'}`}>
                                            {it.progressPercent === null ? '—' : `${it.progressPercent}%`}
                                        </span>
                                        {it.progressPercent !== null && (
                                            <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div 
                                                    className={`h-full ${it.progressPercent < 75 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${it.progressPercent}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStat title="Total Classes" value={allSessionsCounts.total} icon={<BookOpen size={20} />} color="text-slate-600" />
        <SummaryStat title="In Progress" value={allSessionsCounts.inprogress} icon={<Activity className="animate-pulse" size={20} />} color="text-emerald-600" />
        <SummaryStat title="Upcoming" value={allSessionsCounts.upcoming} icon={<Calendar size={20} />} color="text-amber-600" />
        <SummaryStat title="Completed" value={allSessionsCounts.completed} icon={<Clock size={20} />} color="text-indigo-600" />
      </div>
    </div>
  );
}

function SummaryStat({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="border-slate-50 shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</span>
            <div className={`${color} opacity-60`}>{icon}</div>
        </div>
        <div className="text-3xl font-black text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}

