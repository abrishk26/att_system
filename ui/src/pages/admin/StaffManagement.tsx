import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { UniversityIntelligence } from '../../api';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 10;

type InstructorRow = {
  instructor_id: string;
  name: string;
  sessions_total: number;
  sessions_finished: number;
  attendance_rate: number;
  punctuality_index: number;
  completion_proxy: number;
  courses: {
    course_id: string;
    course_name?: string;
    class_label?: string;
    attendance_rate: number;
    sessions_finished: number;
  }[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function rateVariant(rate: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (rate >= 85) return 'default';
  if (rate >= 70) return 'secondary';
  if (rate >= 55) return 'outline';
  return 'destructive';
}

export default function StaffManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InstructorRow | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const intel: UniversityIntelligence = await api.universityAnalytics();
        const sessions = await api.allSessions();
        const instructorCourses = new Map<string, Map<string, { course_id: string; class_id: string }>>();
        for (const s of sessions) {
          if (!instructorCourses.has(s.instructor_id)) {
            instructorCourses.set(s.instructor_id, new Map());
          }
          const key = `${s.course_id}__${s.class_id}`;
          instructorCourses.get(s.instructor_id)!.set(key, {
            course_id: s.course_id,
            class_id: s.class_id,
          });
        }
        const sectionMap = new Map(intel.sections.map((sec) => [`${sec.course_id}__${sec.class_id}`, sec]));
        const courseMap = new Map(intel.courses.map((c) => [c.course_id, c]));

        const next: InstructorRow[] = intel.instructors.map((i) => {
          const pairs = instructorCourses.get(i.instructor_id);
          const courses: InstructorRow['courses'] = [];
          if (pairs) {
            for (const [, pair] of pairs) {
              const sec = sectionMap.get(`${pair.course_id}__${pair.class_id}`);
              const crs = courseMap.get(pair.course_id);
              courses.push({
                course_id: pair.course_id,
                course_name: sec?.course_name ?? crs?.course_name,
                class_label: sec?.class_label,
                attendance_rate: sec?.attendance_rate ?? 0,
                sessions_finished: sec?.sessions_finished ?? 0,
              });
            }
          }
          return {
            instructor_id: i.instructor_id,
            name: i.instructor_name ?? i.instructor_id.slice(0, 8),
            sessions_total: i.sessions_total,
            sessions_finished: i.sessions_finished,
            attendance_rate: i.attendance_rate,
            punctuality_index: i.punctuality_index,
            completion_proxy: i.completion_proxy,
            courses,
          };
        });
        next.sort((a, b) => b.sessions_total - a.sessions_total);
        if (mounted) setRows(next);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load staff');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const avgAttendance =
    rows.length === 0 ? 0 : Math.round(rows.reduce((a, r) => a + r.attendance_rate, 0) / rows.length);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      <PageHeader
        title="Staff management"
        description="Instructor workload, completion rates, and course-level performance across the department."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Instructors</CardDescription>
            <CardTitle className="text-2xl">{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total sessions</CardDescription>
            <CardTitle className="text-2xl">
              {rows.reduce((a, r) => a + r.sessions_total, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. attendance</CardDescription>
            <CardTitle className="text-2xl">{avgAttendance}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading staff…
            </div>
          ) : error ? (
            <p className="p-8 text-center text-destructive">{error}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Instructor</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    <TableHead className="text-right">Punctuality</TableHead>
                    <TableHead className="text-right pr-6">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r) => (
                    <TableRow
                      key={r.instructor_id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelected(r)}
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">{initials(r.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.courses.length} course{r.courses.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.sessions_finished}/{r.sessions_total}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={rateVariant(r.attendance_rate)}>
                          {r.attendance_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.punctuality_index.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right pr-6 tabular-nums">
                        {r.completion_proxy.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-border p-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Finished</p>
                  <p className="text-xl font-bold">
                    {selected.sessions_finished}/{selected.sessions_total}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted-foreground">Attendance</p>
                  <p className="text-xl font-bold">{selected.attendance_rate.toFixed(1)}%</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.courses.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {c.course_name ?? c.course_id.slice(0, 8)}
                        {c.class_label && (
                          <span className="text-xs text-muted-foreground"> · {c.class_label}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{c.sessions_finished}</TableCell>
                      <TableCell className="text-right">{c.attendance_rate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
