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
      <div className="p-8 space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 rounded-2xl"></div>
          <div className="h-96 bg-slate-100 rounded-2xl"></div>
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
        backgroundColor: ['#6366f1', '#f1f5f9'],
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
    if (rate >= 85) return <Badge className="bg-emerald-500 hover:bg-emerald-600">Excellent Standing</Badge>;
    if (rate >= 75) return <Badge className="bg-amber-500 hover:bg-amber-600">Good Standing</Badge>;
    return <Badge variant="destructive">Warning</Badge>;
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Layers className="text-indigo-600" size={32} />
            Student Dashboard
          </h1>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp size={20} className="text-indigo-200" />
              <Badge variant="secondary" className="bg-white/10 text-white border-none">Live Metric</Badge>
            </div>
            <p className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Overall Rate</p>
            <h3 className="text-4xl font-black mt-1">{Math.round(metrics?.overall_attendance || 0)}%</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <BookOpen size={20} className="text-purple-600" />
              <Zap size={16} className="text-amber-500" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Courses</p>
            <h3 className="text-4xl font-black mt-1 text-slate-900">{metrics?.courses_performance.length}</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target size={20} className="text-pink-600" />
              <Award size={16} className="text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Target Goal</p>
            <h3 className="text-4xl font-black mt-1 text-slate-900">85%</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Eligibility Status</p>
            {statusBadge(metrics?.overall_attendance || 0)}
          </CardContent>
        </Card>
      </div>

      {/* Main Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column - Performance Breakdown */}
        <div className="lg:col-span-8 space-y-8">
          <Tabs defaultValue="trend" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900">Performance Analytics</h2>
              <TabsList className="bg-slate-100/50 p-1">
                <TabsTrigger value="trend">Attendance Trend</TabsTrigger>
                <TabsTrigger value="radar">Subject Radar</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="trend">
              <Card className="border-slate-50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Consistency Map</CardTitle>
                  <CardDescription>Visual tracker of your last 7 sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <Line
                      data={lineData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { display: false },
                          x: { grid: { display: false } }
                        },
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="radar">
              <Card className="border-slate-50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Curriculum Radar</CardTitle>
                  <CardDescription>Attendance distribution across your registered courses.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center p-8">
                  <div className="h-[400px] w-full max-w-[500px]">
                    <Radar
                      data={radarData}
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            angleLines: { display: false },
                            suggestedMin: 0,
                            suggestedMax: 100
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-500 pl-6">Course Name</TableHead>
                  <TableHead className="text-center font-bold text-slate-500">Analytics</TableHead>
                  <TableHead className="text-right font-bold text-slate-500 pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.courses_performance.map((cp, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <BookOpen size={16} />
                        </div>
                        <span className="font-bold text-slate-900">{cp.course_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-black text-indigo-600">{Math.round(cp.percentage)}%</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${cp.percentage}%` }}></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant="outline" className={cp.percentage < 75 ? 'border-rose-100 text-rose-500' : 'border-emerald-100 text-emerald-500'}>
                        {cp.percentage < 75 ? 'At Risk' : 'Healthy'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Column - Status */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-slate-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Overall Engagement</CardTitle>
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
                  <span className="text-4xl font-black text-slate-900">{Math.round(metrics?.overall_attendance || 0)}%</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance</span>
                </div>
              </div>
              <div className="w-full space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                    <span className="text-sm font-bold text-slate-600">Present</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{Math.round(metrics?.overall_attendance || 0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-100"></div>
                    <span className="text-sm font-bold text-slate-600">Unaccounted</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{100 - Math.round(metrics?.overall_attendance || 0)}%</span>
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