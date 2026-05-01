import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { fetchDashboardData } from '../../api';
import type { AttendanceTrend, AttendanceDistribution, CoursePerformance } from '../../api';
import { useAuth } from '../../AuthContext';
import './Analytics.css';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];
const PIE_LABELS = [
  { label: 'Excellent (90-100%)', color: '#22c55e' },
  { label: 'Good (80-89%)',       color: '#3b82f6' },
  { label: 'Fair (70-79%)',       color: '#f59e0b' },
  { label: 'Poor (<70%)',         color: '#ef4444' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctFmt = (v: any) => `${v ?? 0}%`;

export default function Analytics() {
  const { user } = useAuth();
  const [trends, setTrends]           = useState<AttendanceTrend[]>([]);
  const [distribution, setDist]       = useState<AttendanceDistribution | null>(null);
  const [performance, setPerf]        = useState<CoursePerformance[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError('');
      const data = await fetchDashboardData(user);
      setTrends(data.trends);
      setDist(data.distribution);
      setPerf(data.performance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const pieData = distribution
    ? [
        { name: 'Excellent', value: distribution.excellent },
        { name: 'Good',      value: distribution.good },
        { name: 'Fair',      value: distribution.fair },
        { name: 'Poor',      value: distribution.poor },
      ]
    : [];

  const topCourse = performance.length > 0
    ? performance.reduce((a, b) => a.attendance > b.attendance ? a : b)
    : null;
  const lowCourse = performance.length > 1
    ? performance.reduce((a, b) => a.attendance < b.attendance ? a : b)
    : null;

  if (loading) return (
    <div className="an-loading"><div className="spinner" /><span>Loading analytics...</span></div>
  );
  if (error) return (
    <div className="an-error"><span>⚠ {error}</span><button onClick={load}>Retry</button></div>
  );

  return (
    <div className="analytics">
      <h2 className="an-title">Analytics Dashboard</h2>

      {/* ── Line Chart ── */}
      <div className="an-card">
        <h3>Department-Wide Attendance Trends</h3>
        <p className="an-sub">Weekly attendance rate across all courses</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
              formatter={pctFmt}
            />
            <Legend
              wrapperStyle={{ fontSize: 13, paddingTop: 16 }}
              formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
              name="Actual Attendance (%)"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Target (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar Chart ── */}
      <div className="an-card">
        <h3>Course Performance Analytics</h3>
        <p className="an-sub">Attendance vs. participation by course</p>
        {performance.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={performance} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="course" stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
                  formatter={pctFmt}
                />
                <Bar dataKey="attendance" name="Attendance %" radius={[6, 6, 0, 0]}>
                  {performance.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry === topCourse ? '#3b82f6' : '#8b5cf6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="an-perf-footer">
              {topCourse && (
                <span className="an-tag top">
                  <span className="tag-icon">↗</span>
                  <span className="tag-label">Top Performer</span>
                  <span className="tag-val">{topCourse.course} ({topCourse.attendance}%)</span>
                </span>
              )}
              {lowCourse && (
                <span className="an-tag low">
                  <span className="tag-icon">↘</span>
                  <span className="tag-label">Needs Attention</span>
                  <span className="tag-val">{lowCourse.course} ({lowCourse.attendance}%)</span>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="an-empty">No course data available yet</div>
        )}
      </div>

      {/* ── Pie Chart ── */}
      <div className="an-card">
        <h3>Department Attendance Distribution</h3>
        <p className="an-sub">Student attendance rate breakdown</p>
        {pieData.some(d => d.value > 0) ? (
          <>
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    dataKey="value"
                    label={({ percent }) =>
                      (percent ?? 0) > 0.03 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                    formatter={(value) => (
                      <span style={{ color: '#6b7280' }}>
                        {PIE_LABELS.find(l => l.label.startsWith(value))?.label ?? value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed legend table */}
            <div className="pie-table">
              {PIE_LABELS.map((item, i) => (
                <div key={i} className="pie-row">
                  <span className="pie-dot" style={{ background: item.color }} />
                  <span className="pie-row-label">{item.label}</span>
                  <span className="pie-row-val">{pieData[i]?.value ?? 0}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="an-empty">No distribution data available yet</div>
        )}
      </div>
    </div>
  );
}
