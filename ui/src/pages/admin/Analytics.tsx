import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { api } from '../../api';
import type { UniversityIntelligence } from '../../api';
import { useAuth } from '../../AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { RefreshCw, Download } from 'lucide-react';
import { exportToExcelFriendlyCsv } from '../../lib/exportUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function chartColors(dark: boolean) {
  const fg = dark ? '#e2e8f0' : '#475569';
  const grid = dark ? '#334155' : '#e2e8f0';
  return { fg, grid };
}

function toIsoStart(d: string) {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00.000Z`).toISOString();
}

function toIsoEnd(d: string) {
  if (!d) return undefined;
  return new Date(`${d}T23:59:59.999Z`).toISOString();
}

export default function Analytics() {
  const { user } = useAuth();
  const [intel, setIntel] = useState<UniversityIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setError('');
      const data = await api.universityAnalytics({
        from: from ? toIsoStart(from) : undefined,
        to: to ? toIsoEnd(to) : undefined,
      });
      setIntel(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user, from, to]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!studentId) {
      setStudentDetail(null);
      return;
    }
    (async () => {
      try {
        const d = await api.adminStudentAnalytics(studentId, {
          from: from ? toIsoStart(from) : undefined,
          to: to ? toIsoEnd(to) : undefined,
        });
        setStudentDetail(d);
      } catch {
        setStudentDetail(null);
      }
    })();
  }, [studentId, from, to]);

  const { fg, grid } = chartColors(dark);

  const lineData = useMemo(() => {
    if (!intel) return null;
    return {
      labels: intel.daily_timeline.map(d => d.date),
      datasets: [
        {
          label: 'Attendance %',
          data: intel.daily_timeline.map(d => Math.round(d.attendance_rate * 10) / 10),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [intel]);

  const dowData = useMemo(() => {
    if (!intel) return null;
    return {
      labels: intel.by_day_of_week.map(d => d.day),
      datasets: [
        {
          label: 'Attendance %',
          data: intel.by_day_of_week.map(d => Math.round(d.attendance_rate * 10) / 10),
          backgroundColor: '#818cf8',
          borderRadius: 6,
        },
        {
          label: 'Punctuality %',
          data: intel.by_day_of_week.map(d => Math.round(d.punctuality_index * 10) / 10),
          backgroundColor: '#34d399',
          borderRadius: 6,
        },
      ],
    };
  }, [intel]);

  const hourData = useMemo(() => {
    if (!intel) return null;
    return {
      labels: intel.by_hour_local.map(h => `${h.hour}:00`),
      datasets: [
        {
          label: 'Attendance %',
          data: intel.by_hour_local.map(h => Math.round(h.attendance_rate * 10) / 10),
          backgroundColor: intel.by_hour_local.map(h =>
            h.sessions === 0 ? 'rgba(148,163,184,0.25)' : '#0ea5e9'
          ),
          borderRadius: 4,
        },
      ],
    };
  }, [intel]);

  const cohortData = useMemo(() => {
    if (!intel) return null;
    return {
      labels: intel.cohort_by_class_year.map(c => c.label),
      datasets: [
        {
          label: 'Attendance %',
          data: intel.cohort_by_class_year.map(c => Math.round(c.attendance_rate * 10) / 10),
          backgroundColor: '#a855f7',
          borderRadius: 8,
        },
      ],
    };
  }, [intel]);

  const chartOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: fg, boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
        },
      },
      scales: {
        x: {
          ticks: { color: fg, maxRotation: 45 },
          grid: { color: grid },
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: fg },
          grid: { color: grid },
        },
      },
    }),
    [fg, grid]
  );

  const heatCells = useMemo(() => {
    if (!intel) return [];
    return intel.session_heatmap;
  }, [intel]);

  const exportRiskCsv = () => {
    if (!intel) return;
    const rows = intel.students_at_risk.map(s => ({
      student: s.student_name ?? '',
      student_id: s.student_id,
      sessions: s.sessions_count,
      attendance_pct: Math.round(s.attendance_rate * 10) / 10,
      punctuality_pct: Math.round(s.punctuality_index * 10) / 10,
      consistency: Math.round(s.consistency_score * 10) / 10,
      volatility: Math.round(s.volatility * 1000) / 1000,
      max_absence_streak: s.max_absence_streak,
      risk_score: Math.round(s.risk_score * 10) / 10,
      predicted_low: s.predicted_low,
    }));
    exportToExcelFriendlyCsv(rows, `at_risk_students_${Date.now()}`);
  };

  if (loading) {
    return (
      <div className={`p-6 space-y-4 min-h-screen ${dark ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div
      className={`min-h-screen pb-12 transition-colors ${dark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Attendance intelligence</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live metrics · enriched from academic registry · refreshed{' '}
            {new Date(intel.meta.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
          />
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Overall attendance"
            value={`${Math.round(intel.kpi.overall_attendance_rate)}%`}
            hint={`${intel.kpi.finished_sessions} finished sessions`}
            dark={dark}
          />
          <Kpi
            label="Punctuality index"
            value={`${Math.round(intel.kpi.punctuality_index)}%`}
            hint="Present ÷ (present + late)"
            dark={dark}
          />
          <Kpi
            label="Active sessions"
            value={`${intel.kpi.active_sessions}`}
            hint={`${intel.kpi.incoming_sessions} incoming`}
            dark={dark}
          />
          <Kpi
            label="Record coverage"
            value={`${Math.round(intel.kpi.record_completeness)}%`}
            hint="Finished sessions with ≥1 row"
            dark={dark}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 text-sm">
          <StatPill label="Students" value={intel.kpi.unique_students} dark={dark} />
          <StatPill label="Instructors" value={intel.kpi.unique_instructors} dark={dark} />
          <StatPill label="Sections" value={intel.kpi.unique_course_offerings} dark={dark} />
          <StatPill label="Absent %" value={`${Math.round(intel.kpi.absent_rate)}%`} dark={dark} />
          <StatPill label="Late %" value={`${Math.round(intel.kpi.late_rate)}%`} dark={dark} />
          <StatPill label="NFC success" value={`${Math.round(intel.tap_audit.success_rate)}%`} dark={dark} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="temporal">Temporal</TabsTrigger>
            <TabsTrigger value="courses">Courses & sections</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
            <TabsTrigger value="risk">Risk & anomalies</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
                <CardHeader>
                  <CardTitle>Status distribution</CardTitle>
                  <CardDescription>All attendance rows in selected range</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {intel.status_distribution.map(s => (
                    <Badge key={s.status} variant="secondary" className="text-xs capitalize">
                      {s.status}: {s.count} ({Math.round(s.pct)}%)
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
                <CardHeader>
                  <CardTitle>Cohort (class year)</CardTitle>
                  <CardDescription>From registrar class metadata · attendance-weighted</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  {cohortData && <Bar data={cohortData} options={chartOpts} />}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="temporal" className="space-y-4">
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>Daily attendance trajectory</CardTitle>
                <CardDescription>Rolling institutional rate by session day (UTC)</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {lineData && <Line data={lineData} options={chartOpts} />}
              </CardContent>
            </Card>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
                <CardHeader>
                  <CardTitle>Day of week</CardTitle>
                  <CardDescription>When attendance peaks or dips</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  {dowData && <Bar data={dowData} options={chartOpts} />}
                </CardContent>
              </Card>
              <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
                <CardHeader>
                  <CardTitle>Session start hour</CardTitle>
                  <CardDescription>Based on session opened timestamp</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  {hourData && <Bar data={hourData} options={chartOpts} />}
                </CardContent>
              </Card>
            </div>
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>Session heatmap</CardTitle>
                <CardDescription>Mon–Sun × hour (UTC) · % engaged (present + late)</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid" style={{ gridTemplateColumns: '48px repeat(24, minmax(0,1fr))' }}>
                    <div />
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="text-[9px] text-center text-slate-500 py-1">
                        {h}
                      </div>
                    ))}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, dow) => (
                      <div key={label} className="contents">
                        <div className="text-xs pr-2 py-0.5 text-slate-500 flex items-center">{label}</div>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const cell = heatCells.find(c => c.dow === dow && c.hour === hour);
                          const v = cell?.value ?? 0;
                          const sat = cell && cell.sessions > 0 ? v : 0;
                          const bg =
                            cell && cell.sessions > 0
                              ? `hsl(239 ${40 + sat * 0.45}% ${dark ? 28 : 92 - sat * 0.35}%)`
                              : dark
                                ? '#0f172a'
                                : '#f8fafc';
                          return (
                            <div
                              key={hour}
                              title={`${label} ${hour}:00 — ${Math.round(v)}% (${cell?.sessions ?? 0} sessions)`}
                              className="h-5 border border-white/5"
                              style={{ background: bg }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>Course performance</CardTitle>
                <CardDescription>Decline score compares first vs second half of each course timeline</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-4">Course</th>
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Att %</th>
                      <th className="py-2">Decline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel.courses.slice(0, 40).map(c => (
                      <tr key={c.course_id} className="border-b border-slate-100 dark:border-slate-800/80">
                        <td className="py-2 pr-4 font-medium">{c.course_name ?? '—'}</td>
                        <td className="py-2 pr-4 text-slate-500">{c.course_code ?? '—'}</td>
                        <td className="py-2 pr-4">{c.sessions_finished}</td>
                        <td className="py-2 pr-4">{Math.round(c.attendance_rate)}%</td>
                        <td className="py-2">{Math.round(c.decline_score * 10) / 10}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>Section engagement</CardTitle>
                <CardDescription>Course offering × class (registrar section label)</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-4">Course</th>
                      <th className="py-2 pr-4">Section</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2">Att %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel.sections.slice(0, 40).map(s => (
                      <tr
                        key={`${s.course_id}-${s.class_id}`}
                        className="border-b border-slate-100 dark:border-slate-800/80"
                      >
                        <td className="py-2 pr-4 font-medium">{s.course_name ?? '—'}</td>
                        <td className="py-2 pr-4">{s.class_label ?? '—'}</td>
                        <td className="py-2 pr-4">{s.sessions_finished}</td>
                        <td className="py-2">{Math.round(s.attendance_rate)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty" className="space-y-4">
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>Instructor analytics</CardTitle>
                <CardDescription>
                  Completion proxy = finished ÷ all sessions for each instructor
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-4">Instructor</th>
                      <th className="py-2 pr-4">Finished</th>
                      <th className="py-2 pr-4">Att %</th>
                      <th className="py-2 pr-4">Punctuality</th>
                      <th className="py-2">Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel.instructors.map(i => (
                      <tr key={i.instructor_id} className="border-b border-slate-100 dark:border-slate-800/80">
                        <td className="py-2 pr-4 font-medium">{i.instructor_name ?? '—'}</td>
                        <td className="py-2 pr-4">
                          {i.sessions_finished}/{i.sessions_total}
                        </td>
                        <td className="py-2 pr-4">{Math.round(i.attendance_rate)}%</td>
                        <td className="py-2 pr-4">{Math.round(i.punctuality_index)}%</td>
                        <td className="py-2">{Math.round(i.completion_proxy)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={exportRiskCsv}>
                <Download className="w-4 h-4 mr-1" />
                Export at-risk (Excel-friendly CSV)
              </Button>
            </div>
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>At-risk learners</CardTitle>
                <CardDescription>
                  Heuristic risk score from attendance, punctuality, volatility, absence streaks
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-4">Student</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Att %</th>
                      <th className="py-2 pr-4">Risk</th>
                      <th className="py-2 pr-4">Streak</th>
                      <th className="py-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel.students_at_risk.slice(0, 80).map(s => (
                      <tr
                        key={s.student_id}
                        className="border-b border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                        onClick={() => setStudentId(s.student_id)}
                      >
                        <td className="py-2 pr-4 font-medium">{s.student_name ?? '—'}</td>
                        <td className="py-2 pr-4">{s.sessions_count}</td>
                        <td className="py-2 pr-4">{Math.round(s.attendance_rate)}%</td>
                        <td className="py-2 pr-4">{Math.round(s.risk_score)}</td>
                        <td className="py-2 pr-4">{s.max_absence_streak}</td>
                        <td className="py-2">
                          {s.predicted_low ? (
                            <Badge variant="destructive">Watch</Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>Anomalies</CardTitle>
                <CardDescription>Rule-based irregularities for compliance review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {intel.anomalies.length === 0 ? (
                  <p className="text-sm text-slate-500">No anomalies detected in current filters.</p>
                ) : (
                  intel.anomalies.map((a, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-sm flex flex-wrap gap-2 justify-between"
                    >
                      <div>
                        <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>{a.kind}</Badge>
                        <p className="mt-1 text-slate-700 dark:text-slate-300">{a.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {[a.course_name, a.instructor_name].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {a.session_id && (
                        <code className="text-[10px] text-slate-400 self-start">{a.session_id}</code>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card className={dark ? 'bg-slate-900 border-slate-800' : ''}>
              <CardHeader>
                <CardTitle>NFC tap audit</CardTitle>
                <CardDescription>Hardware and duplicate-tap health</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Total taps</p>
                  <p className="text-2xl font-bold">{intel.tap_audit.total_taps}</p>
                </div>
                <div>
                  <p className="text-slate-500">Success rate</p>
                  <p className="text-2xl font-bold">{Math.round(intel.tap_audit.success_rate)}%</p>
                </div>
                <div>
                  <p className="text-slate-500">Duplicate taps</p>
                  <p className="text-2xl font-bold">{intel.tap_audit.duplicate_taps}</p>
                </div>
                <div>
                  <p className="text-slate-500">Unknown cards</p>
                  <p className="text-2xl font-bold">{intel.tap_audit.unknown_card_taps}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!studentId} onOpenChange={o => !o && setStudentId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student drill-down</DialogTitle>
          </DialogHeader>
          {studentDetail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Student" value={String(studentDetail.student_name ?? '—')} />
                <Stat label="Sessions" value={String(studentDetail.sessions_count ?? '—')} />
                <Stat label="Attendance %" value={fmtNum(studentDetail.attendance_rate)} />
                <Stat label="Punctuality %" value={fmtNum(studentDetail.punctuality_index)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Day-of-week profile</p>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                  {(Array.isArray(studentDetail.day_of_week) ? studentDetail.day_of_week : []).map(
                    (d: unknown, i: number) => {
                      const row = d as { day?: string; rate?: number; sessions?: number };
                      return (
                        <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                          <span>{row.day}</span>
                          <span>
                            {row.rate != null ? `${Math.round(row.rate)}%` : '—'} · {row.sessions ?? 0} rec.
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, hint, dark }: { label: string; value: string; hint: string; dark: boolean }) {
  return (
    <Card className={dark ? 'bg-slate-900 border-slate-800' : 'shadow-sm'}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-black tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-slate-500 pt-0">{hint}</CardContent>
    </Card>
  );
}

function fmtNum(v: unknown) {
  if (typeof v === 'number' && !Number.isNaN(v)) return `${Math.round(v * 10) / 10}`;
  return '—';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function StatPill({ label, value, dark }: { label: string; value: string | number; dark: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}
