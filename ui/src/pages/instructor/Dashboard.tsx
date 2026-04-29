import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Assignment, InstructorDashboardMetrics } from '../../api';
import {
    Users,
    BookOpen,
    Activity,
    Calendar,
    ArrowRight,
    TrendingUp,
    BarChart3
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

export default function InstructorDashboard() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [metrics, setMetrics] = useState<InstructorDashboardMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [assigns, met] = await Promise.all([
                    api.instructorAssignments(),
                    api.instructorDashboardMetrics()
                ]);
                setAssignments(assigns);
                setMetrics(met);
            } catch (err) {
                console.error('Failed to load dashboard data', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-20 bg-slate-100 rounded-2xl w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl"></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-slate-100 rounded-3xl"></div>
                    <div className="h-96 bg-slate-100 rounded-3xl"></div>
                </div>
            </div>
        );
    }

    const performanceData = {
        labels: metrics?.course_performance.map(cp => cp.course_id) || [],
        datasets: [
            {
                label: 'Attendance Rate %',
                data: metrics?.course_performance.map(cp => cp.attendance_rate) || [],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 8,
            },
        ],
    };

    const trendData = {
        labels: metrics?.trends.map(t => t.date) || [],
        datasets: [
            {
                label: 'Department Avg',
                data: metrics?.trends.map(t => t.rate) || [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const doughnutData = {
        labels: ['Excellent', 'Standard', 'At Risk'],
        datasets: [
            {
                data: [
                    metrics?.course_performance.filter(c => c.attendance_rate >= 85).length || 0,
                    metrics?.course_performance.filter(c => c.attendance_rate < 85 && c.attendance_rate >= 70).length || 0,
                    metrics?.course_performance.filter(c => c.attendance_rate < 70).length || 0,
                ],
                backgroundColor: ['#10b981', '#6366f1', '#f43f5e'],
                borderWidth: 0,
                cutout: '75%',
            },
        ],
    };

    return (
        <div className="p-4 md:p-8 space-y-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-10">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-indigo-600" size={32} />
                        Instructor Console
                    </h1>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <MetricCard
                    title="Active Courses"
                    value={metrics?.stats.active_courses || 0}
                    sub="Assigned modules"
                    icon={<BookOpen size={20} />}
                    color="indigo"
                />
                <MetricCard
                    title="Total Sessions"
                    value={metrics?.stats.total_sessions || 0}
                    sub="Academic year"
                    icon={<Calendar size={20} />}
                    color="emerald"
                />
                <MetricCard
                    title="Avg. Attendance"
                    value={`${Math.round(metrics?.stats.avg_attendance || 0)}%`}
                    sub="Global average"
                    icon={<Activity size={20} />}
                    color="amber"
                />
                <MetricCard
                    title="Total Students"
                    value={metrics?.stats.total_students || 0}
                    sub="Unique learners"
                    icon={<Users size={20} />}
                    color="rose"
                />
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Visual Analytics */}
                <div className="lg:col-span-8 space-y-8">
                    <Tabs defaultValue="courses" className="w-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900">Analytics Suite</h2>
                            <TabsList className="bg-slate-100/80 p-1">
                                <TabsTrigger value="courses">Course Comparison</TabsTrigger>
                                <TabsTrigger value="trends">Timeline Trend</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="courses">
                            <Card className="border-slate-50 shadow-md">
                                <CardHeader>
                                    <CardTitle>Attendance Distribution</CardTitle>
                                    <CardDescription>Cross-course performance benchmarking.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[400px] w-full">
                                        <Bar
                                            data={performanceData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' } },
                                                    x: { grid: { display: false } }
                                                }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="trends">
                            <Card className="border-slate-50 shadow-md">
                                <CardHeader>
                                    <CardTitle>Temporal Analytics</CardTitle>
                                    <CardDescription>Last 7 sessions aggregate attendance movement.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[400px] w-full">
                                        <Line
                                            data={trendData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: { display: false },
                                                    x: { grid: { display: false } }
                                                }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Quick Course Access */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 px-2">
                            <BookOpen className="text-purple-600" size={24} />
                            My Courses
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assignments.map((assign) => (
                                <Card key={assign.id} className="p-6 rounded-[2rem] border-2 border-slate-50 bg-white hover:border-purple-200 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{assign.course_id.toString().slice(0, 8)}</h4>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Section {assign.class_id.toString().slice(0, 8)}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white text-[10px] flex items-center justify-center font-black text-slate-500 shadow-sm">
                                                    {i}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Linked</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status Column */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="border-slate-50 shadow-lg">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-indigo-600" size={18} />
                                <CardTitle className="text-lg">Department Health</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="h-64 w-64 relative mb-8">
                                <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } } }} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-slate-900">{Math.round(metrics?.stats.avg_attendance || 0)}%</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Consistency</span>
                                </div>
                            </div>
                            <div className="w-full space-y-3">
                                <StatusRow color="bg-emerald-500" label="Optimum Attendance" count={metrics?.course_performance.filter(c => c.attendance_rate >= 85).length || 0} />
                                <StatusRow color="bg-indigo-500" label="Standard Performance" count={metrics?.course_performance.filter(c => c.attendance_rate < 85 && c.attendance_rate >= 70).length || 0} />
                                <StatusRow color="bg-rose-500" label="Needs Intervention" count={metrics?.course_performance.filter(c => c.attendance_rate < 70).length || 0} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ title, value, sub, icon, color }: { title: string, value: string | number, sub: string, icon: React.ReactNode, color: string }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
    };
    return (
        <Card className="border-slate-50 shadow-sm overflow-hidden group hover:border-indigo-100 transition-colors">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${colors[color as keyof typeof colors]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
                        <p className="text-xs text-slate-400 font-medium">{sub}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusRow({ color, label, count }: { color: string, label: string, count: number }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm shadow-black/10`}></div>
                <span className="text-xs font-bold text-slate-600">{label}</span>
            </div>
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{count}</span>
        </div>
    );
}
