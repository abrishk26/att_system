import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api';
import type { AttendanceRecordWithStudent, Class, Course, Session, UniversityIntelligence } from '@/api';
import { PageHeader } from '@/components/admin/PageHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buildCourseNameMap, buildInstructorNameMap, formatStatus } from '@/lib/admin/metrics';
import { Activity, Calendar, Clock, Loader2, Search } from 'lucide-react';

const PAGE_SIZE = 12;

type StatusFilter = 'all' | 'upcoming' | 'inprogress' | 'completed';

type Row = {
  session: Session;
  courseName: string;
  classLabel: string;
  instructorName: string;
  enrolled: number;
  present: number;
  attendancePct: number | null;
};

function isCompleted(status: string) {
  return status === 'finished' || status === 'completed';
}

function marksSummary(records: AttendanceRecordWithStudent[]) {
  const enrolled = records.length;
  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const pct = enrolled > 0 ? Math.round((present / enrolled) * 100) : null;
  return { enrolled, present, pct };
}

export default function ClassSchedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sessions, intel] = await Promise.all([
          api.allSessions(),
          api.universityAnalytics().catch(() => null as UniversityIntelligence | null),
        ]);

        const courseNames = buildCourseNameMap(intel);
        const instructorNames = buildInstructorNameMap(intel);

        const sorted = [...sessions].sort((a, b) => {
          const prio = (s: Session) =>
            s.status === 'active' ? 0 : s.status === 'incoming' ? 1 : 2;
          return prio(a) - prio(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const courseCache = new Map<string, Course>();
        const classCache = new Map<string, Class>();

        const enriched: Row[] = await Promise.all(
          sorted.map(async (session) => {
            let course = courseCache.get(session.course_id);
            if (!course) {
              course = await api.courseDetails(session.course_id).catch(() => undefined);
              if (course) courseCache.set(session.course_id, course);
            }
            let cls = classCache.get(session.class_id);
            if (!cls) {
              cls = await api.classDetails(session.class_id).catch(() => undefined);
              if (cls) classCache.set(session.class_id, cls);
            }

            const records = await api.sessionRecords(session.id).catch(() => [] as AttendanceRecordWithStudent[]);
            const summary = marksSummary(records);

            return {
              session,
              courseName:
                courseNames.get(session.course_id) ?? course?.name ?? session.course_id.slice(0, 8),
              classLabel: cls ? `Year ${cls.year} · Section ${cls.section}` : '—',
              instructorName:
                instructorNames.get(session.instructor_id) ??
                session.instructor_id.slice(0, 8),
              enrolled: summary.enrolled,
              present: summary.present,
              attendancePct: summary.pct,
            };
          })
        );

        if (mounted) setRows(enriched);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load schedule');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === 'upcoming') list = list.filter((r) => r.session.status === 'incoming');
    else if (statusFilter === 'inprogress') list = list.filter((r) => r.session.status === 'active');
    else if (statusFilter === 'completed') list = list.filter((r) => isCompleted(r.session.status));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.courseName.toLowerCase().includes(q) ||
          r.instructorName.toLowerCase().includes(q) ||
          r.classLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      inprogress: rows.filter((r) => r.session.status === 'active').length,
      upcoming: rows.filter((r) => r.session.status === 'incoming').length,
      completed: rows.filter((r) => isCompleted(r.session.status)).length,
    };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge>In progress</Badge>;
    if (status === 'incoming') return <Badge variant="secondary">Scheduled</Badge>;
    if (isCompleted(status)) return <Badge variant="outline">Completed</Badge>;
    return <Badge variant="outline">{formatStatus(status)}</Badge>;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <PageHeader
        title="Class schedule"
        description="Every department session with live status and attendance marks where a session has been closed."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="All sessions" value={counts.total} sub="In the system" icon={<Calendar className="h-5 w-5" />} />
        <MetricCard title="In progress" value={counts.inprogress} sub="Being marked now" icon={<Activity className="h-5 w-5" />} />
        <MetricCard title="Scheduled" value={counts.upcoming} sub="Not started" icon={<Clock className="h-5 w-5" />} />
        <MetricCard title="Completed" value={counts.completed} sub="Finished sessions" icon={<Calendar className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Session list</CardTitle>
              <CardDescription>
                Showing {filtered.length} session{filtered.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search course or instructor"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as StatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="inprogress">In progress</SelectItem>
                  <SelectItem value="upcoming">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading schedule…
            </div>
          ) : error ? (
            <p className="p-8 text-center text-sm text-destructive">{error}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Course</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Enrolled</TableHead>
                    <TableHead className="pr-6">Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.session.id}>
                      <TableCell className="pl-6 font-medium">{r.courseName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.classLabel}</TableCell>
                      <TableCell>{r.instructorName}</TableCell>
                      <TableCell>{statusBadge(r.session.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.enrolled > 0 ? r.enrolled : '—'}
                      </TableCell>
                      <TableCell className="pr-6 min-w-[140px]">
                        {r.attendancePct === null ? (
                          <span className="text-xs text-muted-foreground">No marks yet</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs tabular-nums">
                              <span>
                                {r.present}/{r.enrolled} present+late
                              </span>
                              <span className="font-medium">{r.attendancePct}%</span>
                            </div>
                            <Progress value={r.attendancePct} className="h-1.5" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No sessions match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
