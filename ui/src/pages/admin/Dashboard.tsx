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
import { BookOpen, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];


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
      <div className="dash-loading">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-error">
        <span>⚠ {error}</span>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard space-y-8 pb-10">
      {/* Stat Cards */}
      <div className="stat-cards">
        <StatCard
          label="Total Sessions"
          value={stats?.totalSessions ?? 0}
          icon="👥"
          color="#3b82f6"
        />
        <StatCard
          label="Present Today"
          value={stats?.presentToday ?? 0}
          icon="✅"
          color="#22c55e"
        />
        <StatCard
          label="Course Completion"
          value={`${stats?.completionRate ?? 0}%`}
          icon="📚"
          color="#a855f7"
        />
        <StatCard
          label="Avg. Attendance"
          value={`${stats?.avgAttendance ?? 0}%`}
          icon="📊"
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Courses Table Section */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                          <BookOpen size={20} />
                      </div>
                      <h3 className="font-bold text-slate-900">Course Overview</h3>
                  </div>
                  <Link to="/instructor/courses" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                      View All <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
              </div>
              
              <div className="flex-1 rounded-2xl border border-slate-50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-slate-500">Course</TableHead>
                            <TableHead className="text-right font-bold text-slate-500 px-6">Attendance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {performance.slice(0, 5).map((p, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 text-sm">{p.course}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Departmental</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <span className="font-black text-indigo-600">{p.attendance}%</span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
          </div>

          {/* Recent Attendances Table Section */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                          <Calendar size={20} />
                      </div>
                      <h3 className="font-bold text-slate-900">Live Attendances</h3>
                  </div>
                  <Link to="/admin/sessions" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
                      Manage <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
              </div>

              <div className="flex-1 rounded-2xl border border-slate-50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-slate-500">Session ID</TableHead>
                            <TableHead className="text-center font-bold text-slate-500">Status</TableHead>
                            <TableHead className="text-right font-bold text-slate-500 px-6">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentSessions.map((s, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-mono text-[10px] text-slate-500 uppercase tracking-tighter">
                                    {s.id.substring(0, 8)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge className={s.status === 'active' ? 'bg-emerald-500' : 'bg-slate-200 text-slate-600 border-none shadow-none'}>
                                        {s.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-6">
                                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                                        <Clock size={12} />
                                        <span className="text-xs font-medium">Recent</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
          </div>
      </div>

      {/* Line Chart */}
      <div className="chart-card full !rounded-[2rem] border-slate-100">
        <h3 className="!font-black !text-slate-900 !text-xl mb-4">Department-Wide Attendance Trends</h3>
        <p className="chart-sub">Weekly attendance rate across all classes</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
              formatter={pctFormatter}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
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
              stroke="#22c55e"
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              name="Target (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie + Bar */}
      <div className="charts-row">
        <div className="chart-card !rounded-[2rem] border-slate-100">
          <h3 className="!font-black !text-slate-900">Attendance Distribution</h3>
          <p className="chart-sub">Student attendance rate breakdown</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    dataKey="value"
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="empty-state">No completed sessions yet</div>
          )}
        </div>

        <div className="chart-card !rounded-[2rem] border-slate-100">
          <h3 className="!font-black !text-slate-900">Performance Analytics</h3>
          <p className="chart-sub">Attendance vs. participation by course</p>
          {performance.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performance} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="course" stroke="#9ca3af" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}
                    formatter={pctFormatter}
                  />
                  <Bar dataKey="attendance" fill="#8b5cf6" name="Attendance %" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="empty-state">No course performance data yet</div>
          )}
        </div>
      </div>

    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="stat-card !rounded-[2rem] !border-slate-50">
      <div className="stat-top">
        <div className="stat-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      </div>
      <div className="stat-value !text-3xl !font-black !text-slate-900">{value}</div>
      <div className="stat-label !font-bold !text-slate-400 !uppercase !tracking-widest !text-[10px]">{label}</div>
    </div>
  );
}
