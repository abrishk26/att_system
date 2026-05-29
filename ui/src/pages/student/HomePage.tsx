import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../api';
import type { StudentDashboardMetrics } from '../../api';
import {
  TrendingUp,
  BookOpen,
  Target,
  Layers,
  Award,
  Zap
} from 'lucide-react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Radar, Doughnut, Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface StudentContext {
  studentId: string;
}

const HomePage: React.FC = () => {
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
      <div className="p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-muted rounded-2xl"></div>
          <div className="h-96 bg-muted rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Radar Chart Data
  const radarData = {
    labels: metrics?.courses_performance.map(cp => cp.course_name) || [],
    datasets: [
      {
        label: 'Attendance Rate %',
        data: metrics?.courses_performance.map(cp => cp.percentage) || [],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
      },
    ],
  };

  // Doughnut Chart Data
  const doughnutData = {
    labels: ['Present', 'Absent/Excused'],
    datasets: [
      {
        data: [metrics?.overall_attendance || 0, 100 - (metrics?.overall_attendance || 0)],
        backgroundColor: ['#6366f1', 'rgba(255, 255, 255, 0.1)'],
        borderWidth: 0,
      },
    ],
  };

  // Line Chart Data
  const lineData = {
    labels: metrics?.attendance_trend.map(t => t.date) || [],
    datasets: [
      {
        fill: true,
        label: 'Status (100 = Present)',
        data: metrics?.attendance_trend.map(t => t.status === 'present' ? 100 : 0) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const statusBadge = (rate: number) => {
    if (rate >= 85) return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Excellent Standing</Badge>;
    if (rate >= 75) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Good Standing</Badge>;
    return <Badge variant="destructive">Warning</Badge>;
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto transition-colors duration-200">
      {/* Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Layers className="text-primary" size={28} />
            Student Dashboard
          </h1>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp size={20} className="text-primary-foreground/80" />
              <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-none shadow-none">Live Metric</Badge>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider">Overall Rate</p>
            <h3 className="text-3xl font-extrabold mt-1">{Math.round(metrics?.overall_attendance || 0)}%</h3>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <BookOpen size={20} className="text-primary" />
              <Zap size={16} className="text-amber-500" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Courses</p>
            <h3 className="text-3xl font-extrabold mt-1 text-foreground">{metrics?.courses_performance.length}</h3>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target size={20} className="text-pink-600 dark:text-pink-400" />
              <Award size={16} className="text-primary" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Goal</p>
            <h3 className="text-3xl font-extrabold mt-1 text-foreground">85%</h3>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[128px]">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Eligibility Status</p>
            {statusBadge(metrics?.overall_attendance || 0)}
          </CardContent>
        </Card>
      </div>

      {/* Main Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column - Performance Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="trend" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Performance Analytics</h2>
              <TabsList className="bg-muted p-1 rounded-lg">
                <TabsTrigger value="trend" className="rounded-md">Attendance Trend</TabsTrigger>
                <TabsTrigger value="radar" className="rounded-md">Subject Radar</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trend">
              <Card className="bg-card text-card-foreground border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">Consistency Map</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Visual tracker of your last 7 sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <Line
                      data={lineData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { display: false },
                          x: { grid: { display: false }, ticks: { color: 'var(--foreground)' } }
                        },
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="radar">
              <Card className="bg-card text-card-foreground border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">Curriculum Radar</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Attendance distribution across your registered courses.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center p-6">
                  <div className="h-[300px] w-full max-w-[400px]">
                    <Radar
                      data={radarData}
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            angleLines: { display: false },
                            suggestedMin: 0,
                            suggestedMax: 100,
                            ticks: { display: false }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-sm transition-colors">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-bold text-muted-foreground text-xs pl-4 py-3">Course Name</TableHead>
                    <TableHead className="text-center font-bold text-muted-foreground text-xs py-3">Analytics</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground text-xs pr-4 py-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.courses_performance.map((cp, i) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-b border-border transition-colors last:border-b-0 group">
                      <TableCell className="pl-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                            <BookOpen size={16} />
                          </div>
                          <span className="font-bold text-foreground text-sm">{cp.course_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-primary">{Math.round(cp.percentage)}%</span>
                          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${cp.percentage}%` }}></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4 py-3">
                        <Badge variant="outline" className={cp.percentage < 75 ? 'border-rose-200 text-rose-500' : 'border-emerald-200 text-emerald-500'}>
                          {cp.percentage < 75 ? 'At Risk' : 'Healthy'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right Column - Status */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card text-card-foreground border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground">Overall Engagement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative h-64 w-64 mb-6">
                <Doughnut
                  data={doughnutData}
                  options={{
                    cutout: '80%',
                    plugins: { legend: { display: false } }
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-foreground">{Math.round(metrics?.overall_attendance || 0)}%</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Attendance</span>
                </div>
              </div>
              <div className="w-full space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                    <span className="text-xs font-bold text-muted-foreground">Present</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{Math.round(metrics?.overall_attendance || 0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-muted"></div>
                    <span className="text-xs font-bold text-muted-foreground">Unaccounted</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{100 - Math.round(metrics?.overall_attendance || 0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default HomePage;