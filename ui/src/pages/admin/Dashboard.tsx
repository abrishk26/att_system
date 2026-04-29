import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { fetchDashboardData } from '../../api';
import type { DashboardStats, AttendanceTrend, AttendanceDistribution, CoursePerformance } from '../../api';
import { useAuth } from '../../AuthContext';
import './Dashboard.css';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
const PIE_LABELS = ['Excellent (90-100%)', 'Good (80-89%)', 'Fair (70-79%)', 'Poor (<70%)'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctFormatter = (v: any) => `${v ?? 0}%`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<AttendanceTrend[]>([]);
  const [distribution, setDistribution] = useState<AttendanceDistribution | null>(null);
  const [performance, setPerformance] = useState<CoursePerformance[]>([]);
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
    <div className="dashboard">
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

      {/* Line Chart */}
      <div className="chart-card full">
        <h3>Department-Wide Attendance Trends</h3>
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
        <div className="chart-card">
          <h3>Department Attendance Distribution</h3>
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
              <div className="pie-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-label">{PIE_LABELS[i]}</span>
                    <span className="pie-value">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No completed sessions yet</div>
          )}
        </div>

        <div className="chart-card">
          <h3>Course Performance Analytics</h3>
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
              {performance.length > 1 && (
                <div className="perf-footer">
                  <span className="perf-tag top">CS101 (88%)</span>
                  <span className="perf-tag low">OOP1 (37%)</span>
                </div>
              )}
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
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
