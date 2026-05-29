import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { fetchDashboardData, api } from '../../api';
import type { DashboardStats, AttendanceTrend, AttendanceDistribution, CoursePerformance, Session } from '../../api';
import { useAuth } from '../../AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { BookOpen, Calendar, Clock, ArrowRight, Users, CheckCircle, GraduationCap, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctFormatter = (v: any) => `${v ?? 0}%`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<AttendanceTrend[]>([]);
  const [distribution, setDistribution] = useState<AttendanceDistribution | null>(null);
  const [performance, setPerformance] = useState<CoursePerformance[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError('');
      const data = await fetchDashboardData(user);
      setStats(data.stats);
      setTrends(data.trends);
      setDistribution(data.distribution);
      setPerformance(data.performance);
      
      const sessions = await api.allSessions();
      setRecentSessions(sessions.slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const pieData = distribution
    ? [
      { name: 'Excellent', value: distribution.excellent },
      { name: 'Good', value: distribution.good },
      { name: 'Fair', value: distribution.fair },
      { name: 'Poor', value: distribution.poor },
    ].filter(d => d.value > 0)
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="text-sm font-medium">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-destructive">
        <span className="text-sm font-medium">⚠ {error}</span>
        <button onClick={load} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-sm transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Real-time campus-wide attendance stats and analytics.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.totalSessions ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded sessions</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.presentToday ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active live student count</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course Completion</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.completionRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Overall completion rate</p>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg. Attendance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.avgAttendance ?? 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Global average performance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Overview Table Card */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex items-center justify-between flex-row space-y-0 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-secondary rounded-lg text-secondary-foreground">
                <BookOpen size={16} />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Course Overview</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Subject performance analytics</CardDescription>
              </div>
            </div>
            <Link to="/instructor/courses" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group">
              View All <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-md border border-border overflow-hidden bg-background">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-bold text-muted-foreground text-xs py-3 pl-4">Course</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground text-xs py-3 pr-4">Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.slice(0, 5).map((p, i) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-b border-border transition-colors last:border-b-0">
                      <TableCell className="py-3 pl-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{p.course}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Departmental</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <span className="font-bold text-primary">{p.attendance}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Live Attendances Table Card */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex items-center justify-between flex-row space-y-0 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-secondary rounded-lg text-secondary-foreground">
                <Calendar size={16} />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Live Attendances</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Recent class session history</CardDescription>
              </div>
            </div>
            <Link to="/admin/sessions" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group">
              Manage <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-md border border-border overflow-hidden bg-background">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-bold text-muted-foreground text-xs py-3 pl-4">Session ID</TableHead>
                    <TableHead className="text-center font-bold text-muted-foreground text-xs py-3">Status</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground text-xs py-3 pr-4">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((s, i) => (
                    <TableRow key={i} className="hover:bg-muted/50 border-b border-border transition-colors last:border-b-0">
                      <TableCell className="font-mono text-xs text-muted-foreground py-3 pl-4">
                        {s.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Badge className={s.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-muted text-muted-foreground border-none shadow-none hover:bg-muted'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3 pr-4">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Clock size={12} />
                          <span className="text-xs font-medium">Recent</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card className="bg-card text-card-foreground border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Department-Wide Attendance Trends</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Weekly attendance rate across all classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" tick={{ fontSize: 11, fill: 'var(--foreground)' }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12, fill: 'var(--foreground)' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--foreground)' }}
                  formatter={pctFormatter}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10, color: 'var(--foreground)' }} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  name="Actual Attendance (%)"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie + Bar Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Attendance Distribution</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Student attendance rate breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[220px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">No completed sessions yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Performance Analytics</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Attendance vs. participation by course</CardDescription>
          </CardHeader>
          <CardContent>
            {performance.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="course" stroke="var(--muted-foreground)" tick={{ fontSize: 11, fill: 'var(--foreground)' }} />
                    <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12, fill: 'var(--foreground)' }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                      formatter={pctFormatter}
                    />
                    <Bar dataKey="attendance" fill="#8b5cf6" name="Attendance %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">No course performance data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
