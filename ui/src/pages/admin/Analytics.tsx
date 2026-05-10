import { useEffect, useState, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line
} from 'recharts';
import { api } from '../../api';
import type { DepartmentAnalytics } from '../../api';
import { useAuth } from '../../AuthContext';
import './Analytics.css';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pctFmt = (v: any) => `${v ?? 0}%`;

export default function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError('');
      const data = await api.adminAnalytics();
      setAnalytics(data);
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

  if (loading) return (
    <div className="an-loading"><div className="spinner" /><span>Loading analytics...</span></div>
  );
  if (error) return (
    <div className="an-error"><span>⚠ {error}</span><button onClick={load}>Retry</button></div>
  );
  if (!analytics) return null;

  // Prepare chart data
  const trendData = analytics.attendance_by_day.map(d => ({
    day: d.day,
    actual: Math.round(d.rate),
    target: 85,
    sessions: d.sessions,
  }));

  const coursePerformanceData = analytics.top_courses.map(c => ({
    course: c.course_name || c.course_id.slice(0, 8),
    attendance: Math.round(c.attendance_rate),
    sessions: c.session_count,
  }));

  const bottomCoursesData = analytics.bottom_courses.map(c => ({
    course: c.course_name || c.course_id.slice(0, 8),
    attendance: Math.round(c.attendance_rate),
    sessions: c.session_count,
  }));

  // Distribution buckets from top/bottom courses
  const allCourseRates = [...analytics.top_courses, ...analytics.bottom_courses].map(c => c.attendance_rate);
  const uniqueRates = [...new Set(allCourseRates)];
  const distribution = {
    excellent: uniqueRates.filter(r => r >= 90).length,
    good: uniqueRates.filter(r => r >= 80 && r < 90).length,
    fair: uniqueRates.filter(r => r >= 70 && r < 80).length,
    poor: uniqueRates.filter(r => r < 70).length,
  };

  const pieData = [
    { name: 'Excellent', value: distribution.excellent },
    { name: 'Good', value: distribution.good },
    { name: 'Fair', value: distribution.fair },
    { name: 'Poor', value: distribution.poor },
  ];

  const topCourse = coursePerformanceData.length > 0
    ? coursePerformanceData.reduce((a, b) => a.attendance > b.attendance ? a : b)
    : null;
  const lowCourse = bottomCoursesData.length > 0
    ? bottomCoursesData.reduce((a, b) => a.attendance < b.attendance ? a : b)
    : null;

  // Radar data for instructor breakdown
  const radarData = analytics.instructor_breakdown.map(i => ({
    name: i.instructor_name || i.instructor_id.slice(0, 8),
    attendance: Math.round(i.avg_attendance),
    sessions: i.sessions,
  }));

  return (
    <div className="analytics">
      <h2 className="an-title">Analytics Dashboard</h2>

      {/* ── Summary Stats ── */}
      <div className="an-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="an-stat-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Sessions</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', marginTop: '0.25rem' }}>{analytics.total_sessions}</div>
        </div>
        <div className="an-stat-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Students</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', marginTop: '0.25rem' }}>{analytics.total_students}</div>
        </div>
        <div className="an-stat-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Instructors</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', marginTop: '0.25rem' }}>{analytics.total_instructors}</div>
        </div>
        <div className="an-stat-card" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '1.5rem', borderRadius: '1.5rem', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Avg Attendance</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem' }}>{Math.round(analytics.avg_attendance_rate)}%</div>
        </div>
      </div>

      {/* ── Day-of-Week Trend ── */}
      <div className="an-card">
        <h3>Attendance by Day of Week</h3>
        <p className="an-sub">Real attendance rates aggregated across all finished sessions</p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
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
            <Bar dataKey="actual" name="Attendance %" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Target (%)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top Course Performance ── */}
      <div className="an-card">
        <h3>Top Course Performance</h3>
        <p className="an-sub">Highest attendance courses across the department</p>
        {coursePerformanceData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={coursePerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="course" stroke="#9ca3af" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12, fill: '#6b7280' }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
                  formatter={pctFmt}
                />
                <Bar dataKey="attendance" name="Attendance %" radius={[6, 6, 0, 0]}>
                  {coursePerformanceData.map((entry, i) => (
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

      {/* ── Instructor Radar ── */}
      {radarData.length > 0 && (
        <div className="an-card">
          <h3>Instructor Performance Radar</h3>
          <p className="an-sub">Attendance rates by instructor across their sessions</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Attendance %" dataKey="attendance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}
                formatter={pctFmt}
              />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Distribution Pie ── */}
      <div className="an-card">
        <h3>Course Attendance Distribution</h3>
        <p className="an-sub">How courses are distributed by attendance bracket</p>
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
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pie-table">
              {[
                { label: 'Excellent (90-100%)', color: '#22c55e' },
                { label: 'Good (80-89%)', color: '#3b82f6' },
                { label: 'Fair (70-79%)', color: '#f59e0b' },
                { label: 'Poor (<70%)', color: '#ef4444' },
              ].map((item, i) => (
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
