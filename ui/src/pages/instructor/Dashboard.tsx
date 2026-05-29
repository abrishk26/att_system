import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Assignment, InstructorDashboardMetrics } from '../../api';
import {
    Users,
    BookOpen,
    Activity,
    Calendar,
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
    Tooltip as ChartTooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

import StudentReports from '../../components/instructor/reports/StudentReports';
import SessionReports from '../../components/instructor/reports/SessionReports';
import ComparativeReports from '../../components/instructor/reports/ComparativeReports';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    ArcElement,
    Filler
);

interface EnrichedAssignment extends Assignment {
    course_name?: string;
    class_name?: string;
}

interface EnrichedMetrics extends InstructorDashboardMetrics {
    course_performance: Array<{ course_id: string; course_name?: string; attendance_rate: number }>;
}

export default function InstructorDashboard() {
    const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
    const [metrics, setMetrics] = useState<EnrichedMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [rawAssigns, rawMetrics] = await Promise.all([
                    api.instructorAssignments(),
                    api.instructorDashboardMetrics()
                ]);

                // Enrich Assignments with Course and Class Names
                const enrichedAssigns = await Promise.all(
                    rawAssigns.map(async (a) => {
                        try {
                            const [course, cls] = await Promise.all([
                                api.courseDetails(a.course_id),
                                api.classDetails(a.class_id)
                            ]);
                            return { 
                                ...a, 
                                course_name: course.name || course.course_id, 
                                class_name: `Year ${cls.year} Sec ${cls.section}` 
                            } as EnrichedAssignment;
                        } catch {
                            return a as EnrichedAssignment;
                        }
                    })
                );

                // Create a lookup map for course_id to course_name
                const courseNameMap = new Map<string, string>();
                enrichedAssigns.forEach(a => {
                    if (a.course_name) courseNameMap.set(a.course_id.substring(0, 8), a.course_name);
                });

                // Enrich Metrics
                const enrichedMetrics: EnrichedMetrics = {
                    ...rawMetrics,
                    course_performance: rawMetrics.course_performance.map(cp => ({
                        ...cp,
                        course_name: courseNameMap.get(cp.course_id) || cp.course_id.substring(0, 8)
                    }))
                };

                setAssignments(enrichedAssigns);
                setMetrics(enrichedMetrics);
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
            <div className="p-8 space-y-8 animate-pulse max-w-[1600px] mx-auto">
                <div className="h-20 bg-muted rounded-2xl w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl"></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-muted rounded-3xl"></div>
                    <div className="h-96 bg-muted rounded-3xl"></div>
                </div>
            </div>
        );
    }

    const performanceData = {
        labels: metrics?.course_performance.map(cp => cp.course_name) || [],
        datasets: [
            {
                label: 'Attendance Rate %',
                data: metrics?.course_performance.map(cp => cp.attendance_rate) || [],
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.9)'); // Sky 400
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)'); // Blue 500
                    return gradient;
                },
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
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointRadius: 4,
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
        <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-fade-in transition-colors duration-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <BarChart3 className="text-primary" size={28} />
                        Instructor Console
                    </h1>
                    <p className="text-sm text-muted-foreground">Gain deep insights into your students' attendance performance.</p>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Status & Insights Column */}
                <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
                    <Card className="bg-card text-card-foreground border-border shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-primary" size={18} />
                                <CardTitle className="text-lg font-bold">Department Health</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="h-64 w-64 relative mb-6">
                                <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } } }} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-extrabold text-foreground">{Math.round(metrics?.stats.avg_attendance || 0)}%</span>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Consistency</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2">
                                <StatusRow color="bg-emerald-500" label="Optimum Attendance" count={metrics?.course_performance.filter(c => c.attendance_rate >= 85).length || 0} />
                                <StatusRow color="bg-indigo-500" label="Standard Performance" count={metrics?.course_performance.filter(c => c.attendance_rate < 85 && c.attendance_rate >= 70).length || 0} />
                                <StatusRow color="bg-rose-500" label="Needs Intervention" count={metrics?.course_performance.filter(c => c.attendance_rate < 70).length || 0} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Course Access */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-3 px-2">
                            <BookOpen className="text-primary" size={20} />
                            My Assignments
                        </h2>
                        <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-sm transition-colors">
                          <div className="overflow-hidden rounded-xl border border-border bg-background">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent border-b border-border">
                                        <TableHead className="font-bold text-muted-foreground text-xs pl-4">Course</TableHead>
                                        <TableHead className="text-right font-bold text-muted-foreground text-xs pr-4">Class</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.map((assign) => (
                                        <TableRow key={assign.id} className="hover:bg-muted/50 border-b border-border transition-colors last:border-b-0 cursor-pointer group" onClick={() => {/* handle navigation */}}>
                                            <TableCell className="pl-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                                                        {assign.course_name || assign.course_id.toString().slice(0, 8)}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assignment</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-4 py-3">
                                                <Badge variant="outline" className="border-border text-muted-foreground font-bold text-[10px]">
                                                    {assign.class_name || `Section ${assign.class_id.toString().slice(0, 8)}`}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </div>
                        </div>
                    </div>

                    {/* Recent Attendances Table */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-3 px-2">
                            <Activity className="text-primary" size={20} />
                            Recent Attendances
                        </h2>
                        <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-sm transition-colors">
                          <div className="overflow-hidden rounded-xl border border-border bg-background">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent border-b border-border">
                                        <TableHead className="font-bold text-muted-foreground text-xs pl-4">Session</TableHead>
                                        <TableHead className="text-center font-bold text-muted-foreground text-xs">Rate</TableHead>
                                        <TableHead className="text-right font-bold text-muted-foreground text-xs pr-4">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {metrics?.course_performance.slice(0, 5).map((cp, i) => (
                                        <TableRow key={i} className="hover:bg-muted/50 border-b border-border transition-colors last:border-b-0">
                                            <TableCell className="pl-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground text-sm">
                                                        {cp.course_id.substring(0, 8)}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recorded</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-3">
                                                <span className={`font-black ${cp.attendance_rate < 75 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {Math.round(cp.attendance_rate)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-4 py-3">
                                                <Badge variant="outline" className={cp.attendance_rate < 75 ? 'border-rose-200 text-rose-500' : 'border-emerald-200 text-emerald-500'}>
                                                    {cp.attendance_rate < 75 ? 'Intervene' : 'Good'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </div>
                        </div>
                    </div>
                </div>

                {/* Visual Analytics */}
                <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">Analytics Suite</h2>
                            
                            <div className="flex items-center gap-4">
                                <TabsList className="bg-muted p-1 hidden md:flex rounded-lg">
                                    <TabsTrigger value="summary" className="rounded-md">Summary</TabsTrigger>
                                    <TabsTrigger value="students" className="rounded-md">Students</TabsTrigger>
                                    <TabsTrigger value="sessions" className="rounded-md">Sessions</TabsTrigger>
                                    <TabsTrigger value="comparative" className="rounded-md">Comparative</TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsList className="bg-muted p-1 flex md:hidden w-full overflow-x-auto rounded-lg">
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="students">Students</TabsTrigger>
                                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                                <TabsTrigger value="comparative">Comparative</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Summary Tab */}
                        <TabsContent value="summary" className="space-y-6 mt-0">
                            <Card className="bg-card text-card-foreground border-border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold">Attendance Distribution</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Cross-course performance benchmarking using actual course names.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full">
                                        <Bar
                                            data={performanceData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { 
                                                    legend: { display: false },
                                                    tooltip: {
                                                        backgroundColor: 'var(--card)',
                                                        titleColor: 'var(--foreground)',
                                                        bodyColor: 'var(--foreground)',
                                                        borderColor: 'var(--border)',
                                                        borderWidth: 1,
                                                        titleFont: { size: 14, family: 'Inter' },
                                                        padding: 12,
                                                        cornerRadius: 8,
                                                    }
                                                },
                                                scales: {
                                                    y: { 
                                                        beginAtZero: true, 
                                                        max: 100, 
                                                        grid: { color: 'var(--border)' }, 
                                                        ticks: { color: 'var(--foreground)', font: { family: 'Inter', weight: 600 as const } } 
                                                    },
                                                    x: { 
                                                        grid: { display: false }, 
                                                        ticks: { color: 'var(--foreground)', font: { family: 'Inter', weight: 600 as const } } 
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-card text-card-foreground border-border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base font-bold">Temporal Analytics</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Aggregate attendance movement over time.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] w-full">
                                        <Line
                                            data={trendData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { 
                                                    legend: { display: false },
                                                    tooltip: {
                                                        backgroundColor: 'var(--card)',
                                                        titleColor: 'var(--foreground)',
                                                        bodyColor: 'var(--foreground)',
                                                        borderColor: 'var(--border)',
                                                        borderWidth: 1,
                                                        padding: 12,
                                                    }
                                                },
                                                scales: {
                                                    y: { display: false },
                                                    x: { 
                                                        grid: { display: false }, 
                                                        ticks: { color: 'var(--foreground)', font: { family: 'Inter', weight: 600 as const } } 
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Students Tab */}
                        <TabsContent value="students" className="mt-0">
                            <StudentReports assignments={assignments} />
                        </TabsContent>

                        {/* Sessions Tab */}
                        <TabsContent value="sessions" className="mt-0">
                            <SessionReports assignments={assignments} />
                        </TabsContent>

                        {/* Comparative Tab */}
                        <TabsContent value="comparative" className="mt-0">
                            <ComparativeReports metrics={metrics} />
                        </TabsContent>

                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, sub, icon, color }: { title: string, value: string | number, sub: string, icon: React.ReactNode, color: string }) {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    };
    return (
        <Card className="bg-card text-card-foreground border-border shadow-sm overflow-hidden group hover:border-primary transition-colors">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${colors[color as keyof typeof colors]} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                        <h3 className="text-2xl font-bold text-foreground mt-0.5">{value}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{sub}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusRow({ color, label, count }: { color: string, label: string, count: number }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm shadow-black/10`}></div>
                <span className="text-xs font-bold text-muted-foreground">{label}</span>
            </div>
            <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded">{count}</span>
        </div>
    );
}
