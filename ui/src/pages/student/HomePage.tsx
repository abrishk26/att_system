import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api, type StudentDashboardMetrics } from '../../api';
import {
  TrendingUp,
  BookOpen,
  CalendarCheck,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { RecentSessionsChart } from '@/components/student/home/RecentSessionsChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Badge } from '@/components/ui/badge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

interface StudentContext {
  studentId: string;
}

export default function HomePage() {
  const { studentId } = useOutletContext<StudentContext>();
  const [metrics, setMetrics] = useState<StudentDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await api.studentDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load student metrics', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const overall = Math.round(metrics?.overall_attendance ?? 0);
  const courses = metrics?.courses_performance ?? [];

  const barData = {
    labels: courses.map((c) => c.course_name),
    datasets: [
      {
        label: 'Attendance %',
        data: courses.map((c) => Math.round(c.percentage)),
        backgroundColor: 'hsl(var(--primary) / 0.85)',
        borderRadius: 6,
      },
    ],
  };

  const doughnutData = {
    labels: ['Accounted', 'Unaccounted'],
    datasets: [
      {
        data: [overall, Math.max(0, 100 - overall)],
        backgroundColor: ['hsl(var(--primary))', 'hsl(var(--muted))'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Your attendance overview for ${new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}.`}
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link to="/student/history">
              View all courses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Overall attendance</p>
              <p className="text-2xl font-semibold tabular-nums">{overall}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Enrolled courses</p>
              <p className="text-2xl font-semibold tabular-nums">{courses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Recent sessions</p>
              <p className="text-2xl font-semibold tabular-nums">
                {metrics?.attendance_trend.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Attendance by course</CardTitle>
            <CardDescription>How you're doing in each enrolled course.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {courses.length > 0 ? (
                <Bar
                  data={barData}
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
                  No course data yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative h-48 w-48">
              <Doughnut
                data={doughnutData}
                options={{ cutout: '75%', plugins: { legend: { display: false } } }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums">{overall}%</span>
                <span className="text-xs text-muted-foreground">Accounted</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent sessions</CardTitle>
            <CardDescription>
              How you were marked in each of your latest classes — color shows present, late, excused, or absent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSessionsChart trend={metrics?.attendance_trend ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">My courses</CardTitle>
              <CardDescription>Tap a course to see session details.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/history">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-[140px]">Rate</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => {
                  const rate = Math.round(course.percentage);
                  const courseId = course.course_id;
                  return (
                    <TableRow key={courseId ?? course.course_name}>
                      <TableCell>
                        {courseId ? (
                          <Link
                            to={`/student/course/${courseId}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {course.course_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{course.course_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-2 flex-1" />
                          <span className="w-10 text-right text-sm tabular-nums">{rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={rate >= 85 ? 'default' : rate >= 75 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {rate >= 85 ? 'Strong' : rate >= 75 ? 'On track' : 'Needs attention'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!courses.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No courses enrolled yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
