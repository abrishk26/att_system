import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Calendar,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api } from '@/api';
import type { PermissionWithStudent, Session, UniversityIntelligence } from '@/api';
import { PageHeader } from '@/components/admin/PageHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildCourseNameMap,
  buildInstructorNameMap,
  formatStatus,
  pct,
  sessionCounts,
} from '@/lib/admin/metrics';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type LiveSession = Session & { courseLabel: string; instructorLabel: string };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [intel, setIntel] = useState<UniversityIntelligence | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<PermissionWithStudent[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [sess, pending, uni] = await Promise.all([
        api.allSessions(),
        api.allPermissions('pending').catch(() => [] as PermissionWithStudent[]),
        api.universityAnalytics(),
      ]);
      setSessions(sess);
      setPendingPermissions(pending);
      setIntel(uni);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const courseNames = useMemo(() => buildCourseNameMap(intel), [intel]);
  const instructorNames = useMemo(() => buildInstructorNameMap(intel), [intel]);

  const counts = useMemo(() => sessionCounts(sessions), [sessions]);

  const liveSessions: LiveSession[] = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'active' || s.status === 'incoming')
      .sort((a, b) => {
        const p = (x: Session) => (x.status === 'active' ? 0 : 1);
        return p(a) - p(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 12)
      .map((s) => ({
        ...s,
        courseLabel: courseNames.get(s.course_id) ?? s.course_id.slice(0, 8),
        instructorLabel: instructorNames.get(s.instructor_id) ?? s.instructor_id.slice(0, 8),
      }));
  }, [sessions, courseNames, instructorNames]);

  const recentFinished = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'completed' || s.status === 'finished')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map((s) => ({
        ...s,
        courseLabel: courseNames.get(s.course_id) ?? s.course_id.slice(0, 8),
      }));
  }, [sessions, courseNames]);

  const weekTrend = useMemo(() => {
    if (!intel) return [];
    return intel.daily_timeline.slice(-14).map((d) => ({
      date: d.date.slice(5),
      rate: Math.round(d.attendance_rate * 10) / 10,
    }));
  }, [intel]);

  const highAlerts = useMemo(
    () => intel?.anomalies.filter((a) => a.severity === 'high').slice(0, 5) ?? [],
    [intel]
  );

  const atRiskCount = intel?.students_at_risk.filter((s) => s.predicted_low).length ?? 0;

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error && !intel) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" onClick={() => load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Dashboard"
        description={`${todayLabel} — what needs your attention right now across sessions, permissions, and attendance.`}
        actions={
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Sessions in progress"
          value={counts.active}
          sub="Being marked right now"
          icon={<Activity className="h-5 w-5" />}
          href="/admin/schedule"
        />
        <MetricCard
          title="Scheduled"
          value={counts.scheduled}
          sub="Not started yet"
          icon={<Calendar className="h-5 w-5" />}
          href="/admin/sessions"
        />
        <MetricCard
          title="Pending permissions"
          value={pendingPermissions.length}
          sub="Student absence requests"
          icon={<ShieldCheck className="h-5 w-5" />}
          href="/admin/permissions"
        />
        <MetricCard
          title="Department attendance"
          value={intel ? pct(intel.kpi.overall_attendance_rate) : '—'}
          sub="Present + late ÷ all marks (all time)"
          icon={<Users className="h-5 w-5" />}
          href="/admin/analytics"
        />
        <MetricCard
          title="Students flagged"
          value={atRiskCount}
          sub="Predicted low attendance"
          icon={<AlertTriangle className="h-5 w-5" />}
          href="/admin/analytics"
        />
      </div>

      {pendingPermissions.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {pendingPermissions.length} permission request
                {pendingPermissions.length !== 1 ? 's' : ''} waiting for approval
              </p>
              <p className="text-sm text-muted-foreground">
                Students submitted absence reasons that instructors or you must review.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link to="/admin/permissions">Open permission inbox</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live & upcoming sessions</CardTitle>
            <CardDescription>
              Sessions currently active or scheduled. Open the schedule for full filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Course</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-medium">{s.courseLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{s.instructorLabel}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {formatStatus(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {liveSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No active or scheduled sessions at the moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention required</CardTitle>
            <CardDescription>Issues surfaced by the attendance system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highAlerts.length === 0 && atRiskCount === 0 && (
              <p className="text-sm text-muted-foreground">No high-priority alerts right now.</p>
            )}
            {atRiskCount > 0 && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{atRiskCount} students flagged at-risk</p>
                <p className="mt-1 text-muted-foreground">
                  Based on low attendance rate, absence streaks, or inconsistent marks.
                </p>
                <Button variant="link" className="mt-2 h-auto p-0" asChild>
                  <Link to="/admin/analytics">View in analytics</Link>
                </Button>
              </div>
            )}
            {highAlerts.map((a, i) => (
              <div key={i} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium">{a.kind}</p>
                <p className="mt-1 text-muted-foreground">{a.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance last 14 days</CardTitle>
            <CardDescription>
              Daily rate from completed sessions. Detailed breakdowns live under Analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            {weekTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough session history yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently completed</CardTitle>
            <CardDescription>Last finished sessions in the department</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Course</TableHead>
                  <TableHead className="pr-6 text-right">Ended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentFinished.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-medium">{s.courseLabel}</TableCell>
                    <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {recentFinished.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                      No completed sessions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto justify-start py-4" asChild>
          <Link to="/admin/sessions">
            <ClipboardList className="mr-2 h-4 w-4 shrink-0" />
            All sessions ({counts.total})
          </Link>
        </Button>
        <Button variant="outline" className="h-auto justify-start py-4" asChild>
          <Link to="/admin/staff">Staff performance</Link>
        </Button>
        <Button variant="outline" className="h-auto justify-start py-4" asChild>
          <Link to="/admin/reports">Export reports</Link>
        </Button>
        <Button variant="outline" className="h-auto justify-start py-4" asChild>
          <Link to="/admin/analytics">Full analytics</Link>
        </Button>
      </div>
    </div>
  );
}
