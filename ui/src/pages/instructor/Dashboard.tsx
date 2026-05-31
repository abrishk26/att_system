import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { EnrichedAssignment, InstructorDashboardMetrics, Session } from '../../api';
import {
  Users,
  BookOpen,
  Activity,
  Calendar,
  TrendingUp,
  UserCheck,
  FileText,
  ArrowRight,
  Plus,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  ChartTooltip,
  Legend,
  Filler
);

interface EnrichedSession extends Session {
  course_name: string;
  class_name: string;
}

function sectionLabel(a: EnrichedAssignment) {
  return `Year ${a.class_year} · Section ${a.class_section}`;
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [metrics, setMetrics] = useState<InstructorDashboardMetrics | null>(null);
  const [recentSessions, setRecentSessions] = useState<EnrichedSession[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [enrichedAssigns, rawMetrics, sessions, permissions] = await Promise.all([
          api.enrichedAssignments(),
          api.instructorDashboardMetrics(),
          api.instructorSessions(),
          api.allPermissions('pending').catch(() => []),
        ]);

        const courseNameMap = new Map<string, string>();
        const classNameMap = new Map<string, string>();
        enrichedAssigns.forEach((a) => {
          courseNameMap.set(a.course_id, a.course_name);
          classNameMap.set(a.class_id, sectionLabel(a));
        });

        const sortedSessions = sessions.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const enrichedSessions: EnrichedSession[] = sortedSessions.slice(0, 8).map((s) => ({
          ...s,
          course_name: courseNameMap.get(s.course_id) ?? '—',
          class_name: classNameMap.get(s.class_id) ?? '—',
        }));

        setAssignments(enrichedAssigns);
        setMetrics(rawMetrics);
        setRecentSessions(enrichedSessions);
        setPendingPermissions(permissions.length);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const coursePerformance = (metrics?.course_performance ?? []).map((cp) => ({
    ...cp,
    displayName:
      cp.course_name ??
      assignments.find((a) => a.course_id === cp.course_id)?.course_name ??
      'Course',
  }));

  const sessionStatusCounts = recentSessions.reduce(
    (acc, s) => {
      const key =
        s.status === 'finished' || s.status === 'completed'
          ? 'finished'
          : s.status === 'ongoing' || s.status === 'active'
            ? 'active'
            : 'other';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const performanceData = {
    labels: coursePerformance.map((cp) => cp.displayName),
    datasets: [
      {
        label: 'Attendance %',
        data: coursePerformance.map((cp) => cp.attendance_rate),
        backgroundColor: 'hsl(var(--primary) / 0.85)',
        borderRadius: 6,
      },
    ],
  };

  const trendData = {
    labels: metrics?.trends.map((t) => t.date) || [],
    datasets: [
      {
        label: 'Attendance rate',
        data: metrics?.trends.map((t) => t.rate) || [],
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
      },
    ],
  };

  const sessionDoughnut = {
    labels: ['Active', 'Finished', 'Other'],
    datasets: [
      {
        data: [
          sessionStatusCounts.active ?? 0,
          sessionStatusCounts.finished ?? 0,
          sessionStatusCounts.other ?? 0,
        ],
        backgroundColor: [
          'hsl(var(--primary))',
          'hsl(142 76% 36% / 0.85)',
          'hsl(var(--muted-foreground) / 0.4)',
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} — courses, sessions, and attendance at a glance.`}
        icon={<Activity className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/instructor/reports">
                <FileText className="mr-2 h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to="/instructor/attendance">
                <Plus className="mr-2 h-4 w-4" />
                New session
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Active courses"
          value={metrics?.stats.active_courses ?? 0}
          sub="Assigned sections"
          icon={<BookOpen className="h-5 w-5" />}
        />
        <MetricCard
          title="Total sessions"
          value={metrics?.stats.total_sessions ?? 0}
          sub="This term"
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg. attendance"
          value={`${Math.round(metrics?.stats.avg_attendance ?? 0)}%`}
          sub="Across all courses"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Students"
          value={metrics?.stats.total_students ?? 0}
          sub="Enrolled total"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Pending permissions"
          value={pendingPermissions}
          sub="Awaiting review"
          icon={<ShieldCheck className="h-5 w-5" />}
          href="/instructor/permissions"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance by course</CardTitle>
            <CardDescription>Compare section performance across your assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {coursePerformance.length ? (
                <Bar
                  data={performanceData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, max: 100, grid: { color: 'hsl(var(--border))' } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No course data yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance trend</CardTitle>
            <CardDescription>Recent movement over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {metrics?.trends.length ? (
                <Line
                  data={trendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, max: 100 },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No trend data yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent session status</CardTitle>
            <CardDescription>Breakdown of your latest sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-[200px] max-w-[200px]">
              {recentSessions.length > 0 ? (
                <Doughnut
                  data={sessionDoughnut}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No sessions yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Course performance summary</CardTitle>
            <CardDescription>Attendance rate per assigned course.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-[200px]">Rate</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coursePerformance.map((cp) => (
                  <TableRow key={cp.course_id}>
                    <TableCell className="font-medium">{cp.displayName}</TableCell>
                    <TableCell>
                      <Progress value={cp.attendance_rate} className="h-2" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {Math.round(cp.attendance_rate)}%
                    </TableCell>
                  </TableRow>
                ))}
                {!coursePerformance.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No performance data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>Latest activity across your classes.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor/attendance">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.course_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.class_name}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(s.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'finished' ? 'secondary' : 'default'} className="capitalize">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate('/instructor/attendance')}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!recentSessions.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No sessions yet. Start your first session from Attendance.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>My courses</CardTitle>
              <CardDescription>Sections assigned to you.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor/courses">
                All courses <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.course_name}</TableCell>
                    <TableCell className="text-muted-foreground">{sectionLabel(a)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate('/instructor/courses')}>
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!assignments.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No course assignments.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {pendingPermissions > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  {pendingPermissions} permission request{pendingPermissions !== 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-muted-foreground">Review student absence submissions.</p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/instructor/permissions">Review permissions</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  sub,
  icon,
  href,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: import('react').ReactNode;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'transition-colors hover:bg-accent/50' : undefined}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
