import { useState, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../../api';
import type { AttendanceRecordWithStudent, Course, Class, Session } from '../../api';
import { exportToPDF, exportToExcelFriendlyCsv } from '../../lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Download,
  FileText,
  Printer,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Users,
  Calendar,
  BarChart2,
  RefreshCw,
  Activity,
  Target,
  Flame,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentSummary {
  student_id: string;
  name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  pct: number;
  risk: 'high' | 'medium' | 'low';
}

interface SessionPoint {
  date: string;
  rate: number;
  session_id: string;
}

interface CourseReport {
  courseName: string;
  courseCode: string;
  classLabel: string;
  totalSessions: number;
  totalEnrolled: number;
  activeStudents: number;
  overallPct: number;
  avgPct: number;
  belowThreshold: number;   // < 70%
  best: StudentSummary | null;
  worst: StudentSummary | null;
  timeline: SessionPoint[];
  students: StudentSummary[];
  engagementScore: number;  // 0-100
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function riskLabel(pct: number): StudentSummary['risk'] {
  if (pct < 65) return 'high';
  if (pct < 75) return 'medium';
  return 'low';
}

function engagementScore(overallPct: number, consistency: number): number {
  return Math.round(overallPct * 0.7 + consistency * 0.3);
}

function scoreColour(s: number) {
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Healthy';
  if (s >= 60) return 'Moderate';
  return 'At Risk';
}

function openPrint(title: string, metaHtml: string, bodyHtml: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;padding:2rem;color:#0f172a;max-width:1100px;margin:0 auto}
    h1{font-size:1.4rem;margin:0 0 0.25rem;font-weight:800}
    h2{font-size:1rem;margin:1.5rem 0 0.5rem;font-weight:700}
    .meta{color:#64748b;font-size:0.8rem;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:0.75rem}
    .meta span{background:#f1f5f9;padding:2px 8px;border-radius:4px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem}
    .kpi-val{font-size:1.6rem;font-weight:900;line-height:1}
    .kpi-lbl{font-size:0.65rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:0.8rem}
    th{background:#1e293b;color:#fff;padding:7px 10px;text-align:left;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:.05em}
    td{padding:6px 10px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .high{color:#dc2626;font-weight:700} .medium{color:#d97706;font-weight:700} .low{color:#059669;font-weight:700}
    @media print{body{padding:0.5rem}}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">${metaHtml}</div>
  ${bodyHtml}
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

// ── Skeletons ──────────────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CourseAttendanceReport() {
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const [report, setReport] = useState<CourseReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // ── Load filter options ────────────────────────────────────────────────────

  const loadFilterOptions = useCallback(async () => {
    if (coursesLoaded) return;
    try {
      const sessions = await api.allSessions();
      const cIds = [...new Set(sessions.map((s) => s.course_id))];
      const clIds = [...new Set(sessions.map((s) => s.class_id))];
      const [cs, cls] = await Promise.all([
        Promise.all(cIds.map((id) => api.courseDetails(id).catch(() => null))),
        Promise.all(clIds.map((id) => api.classDetails(id).catch(() => null))),
      ]);
      setCourses(cs.filter(Boolean) as Course[]);
      setClasses(cls.filter(Boolean) as Class[]);
      setCoursesLoaded(true);
    } catch { /* silent */ }
  }, [coursesLoaded]);

  // ── Generate ───────────────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!courseId || !classId) {
      setError('Please select both a course and a class.');
      return;
    }
    setError('');
    setLoading(true);
    setReport(null);

    try {
      const allSessions: Session[] = await api.allSessions();
      let sessions = allSessions.filter(
        (s) => s.course_id === courseId && s.class_id === classId && s.status === 'finished'
      );

      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00.000Z');
        sessions = sessions.filter((s) => new Date(s.created_at) >= from);
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59.999Z');
        sessions = sessions.filter((s) => new Date(s.created_at) <= to);
      }

      if (sessions.length === 0) {
        setError('No finished sessions found for the selected filters.');
        setLoading(false);
        return;
      }

      sessions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const recordsBySession = await Promise.all(
        sessions.map((s) => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
      );

      // Build student map
      const studentMap = new Map<string, {
        name: string;
        present: number;
        late: number;
        absent: number;
        excused: number;
      }>();

      recordsBySession.forEach((recs) => {
        recs.forEach((r) => {
          if (!studentMap.has(r.student_id)) {
            studentMap.set(r.student_id, { name: r.student_name, present: 0, late: 0, absent: 0, excused: 0 });
          }
          const e = studentMap.get(r.student_id)!;
          if (r.status === 'present') e.present++;
          else if (r.status === 'late') e.late++;
          else if (r.status === 'absent') e.absent++;
          else if (r.status === 'excused') e.excused++;
        });
      });

      // Student summaries
      const students: StudentSummary[] = Array.from(studentMap.entries()).map(([sid, s]) => {
        const total = s.present + s.late + s.absent + s.excused;
        const engaged = s.present + s.late + s.excused;
        const pct = total > 0 ? (engaged / total) * 100 : 0;
        return {
          student_id: sid,
          name: s.name,
          total,
          present: s.present,
          late: s.late,
          absent: s.absent,
          excused: s.excused,
          pct,
          risk: riskLabel(pct),
        };
      });

      students.sort((a, b) => b.pct - a.pct);

      // Timeline (attendance rate per session)
      const timeline: SessionPoint[] = sessions.map((s, i) => {
        const recs = recordsBySession[i];
        const total = recs.length;
        const engaged = recs.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
        return {
          date: new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          rate: total > 0 ? (engaged / total) * 100 : 0,
          session_id: s.id,
        };
      });

      // Overall / avg
      const allRecords = recordsBySession.flat();
      const totalRecords = allRecords.length;
      const totalEngaged = allRecords.filter(
        (r) => r.status === 'present' || r.status === 'late' || r.status === 'excused'
      ).length;
      const overallPct = totalRecords > 0 ? (totalEngaged / totalRecords) * 100 : 0;
      const avgPct = students.length > 0
        ? students.reduce((a, s) => a + s.pct, 0) / students.length
        : 0;

      // Consistency: std deviation of timeline rates (lower = more consistent)
      const rates = timeline.map((t) => t.rate);
      const mean = rates.reduce((a, b) => a + b, 0) / (rates.length || 1);
      const variance = rates.reduce((a, b) => a + (b - mean) ** 2, 0) / (rates.length || 1);
      const std = Math.sqrt(variance);
      const consistency = Math.max(0, 100 - std); // consistency proxy

      const courseObj = courses.find((c) => c.id === courseId);
      const classObj = classes.find((c) => c.id === classId);

      setReport({
        courseName: courseObj?.name ?? courseId.slice(0, 12),
        courseCode: courseObj?.course_id ?? '',
        classLabel: classObj ? `Year ${classObj.year} · Section ${classObj.section}` : classId.slice(0, 8),
        totalSessions: sessions.length,
        totalEnrolled: students.length,
        activeStudents: students.filter((s) => s.total > 0).length,
        overallPct,
        avgPct,
        belowThreshold: students.filter((s) => s.pct < 70).length,
        best: students[0] ?? null,
        worst: students[students.length - 1] ?? null,
        timeline,
        students,
        engagementScore: engagementScore(overallPct, consistency),
        generatedAt: new Date().toLocaleString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [courseId, classId, dateFrom, dateTo, courses, classes]);

  // ── Filtered students ──────────────────────────────────────────────────────

  const visibleStudents = useMemo(() => {
    if (!report) return [];
    if (riskFilter === 'all') return report.students;
    return report.students.filter((s) => s.risk === riskFilter);
  }, [report, riskFilter]);

  // ── Charts ─────────────────────────────────────────────────────────────────

  const timelineChart = useMemo(() => {
    if (!report) return null;
    return {
      labels: report.timeline.map((t) => t.date),
      datasets: [
        {
          label: 'Session attendance %',
          data: report.timeline.map((t) => Math.round(t.rate * 10) / 10),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Threshold (70%)',
          data: report.timeline.map(() => 70),
          borderColor: '#ef4444',
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [report]);

  const riskChart = useMemo(() => {
    if (!report) return null;
    const high = report.students.filter((s) => s.risk === 'high').length;
    const medium = report.students.filter((s) => s.risk === 'medium').length;
    const low = report.students.filter((s) => s.risk === 'low').length;
    return {
      labels: ['High risk (<65%)', 'Medium risk (65–74%)', 'Low risk (≥75%)'],
      datasets: [
        {
          data: [high, medium, low],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [report]);

  const topStudentsChart = useMemo(() => {
    if (!report) return null;
    const slice = report.students.slice(0, 10);
    return {
      labels: slice.map((s) => s.name.split(' ')[0] ?? s.name),
      datasets: [
        {
          label: 'Attendance %',
          data: slice.map((s) => Math.round(s.pct * 10) / 10),
          backgroundColor: slice.map((s) =>
            s.risk === 'high' ? '#ef4444' : s.risk === 'medium' ? '#f59e0b' : '#10b981'
          ),
          borderRadius: 6,
        },
      ],
    };
  }, [report]);

  const baseChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
      y: { min: 0, max: 100, ticks: { color: '#64748b' }, grid: { color: '#e2e8f0' } },
    },
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } },
    },
  };

  // ── Exports ────────────────────────────────────────────────────────────────

  const stamp = () => report
    ? `${report.courseCode || 'course'}_${Date.now()}`
    : `course_report_${Date.now()}`;

  const exportStudents = useMemo(
    () =>
      (report?.students ?? []).map((s) => ({
        Name: s.name,
        Present: s.present,
        Late: s.late,
        Absent: s.absent,
        Excused: s.excused,
        'Attendance %': Math.round(s.pct * 10) / 10,
        Risk: s.risk,
      })),
    [report]
  );

  const doExportCsv = () => {
    setExporting(true);
    exportToExcelFriendlyCsv(exportStudents, stamp());
    setExporting(false);
  };

  const doExportPdf = () => {
    if (!report) return;
    setExporting(true);
    const cols = [
      { header: 'Student', dataKey: 'Name' },
      { header: 'Present', dataKey: 'Present' },
      { header: 'Late', dataKey: 'Late' },
      { header: 'Absent', dataKey: 'Absent' },
      { header: 'Excused', dataKey: 'Excused' },
      { header: 'Att %', dataKey: 'Attendance %' },
      { header: 'Risk', dataKey: 'Risk' },
    ];
    const rows = exportStudents.map((r) => {
      const o: Record<string, string | number | null | undefined> = {};
      for (const [k, v] of Object.entries(r)) o[k] = v;
      return o;
    });
    exportToPDF(
      `Course Attendance — ${report.courseName} ${report.classLabel}`,
      cols,
      rows,
      stamp()
    );
    setExporting(false);
  };

  const doPrint = () => {
    if (!report) return;
    const metaHtml = [
      `<span>Course: ${report.courseName}</span>`,
      `<span>Code: ${report.courseCode}</span>`,
      `<span>Class: ${report.classLabel}</span>`,
      `<span>Sessions: ${report.totalSessions}</span>`,
      `<span>Enrollment: ${report.totalEnrolled}</span>`,
      `<span>Overall attendance: ${Math.round(report.overallPct)}%</span>`,
      `<span>Engagement score: ${report.engagementScore}/100</span>`,
      `<span>Generated: ${report.generatedAt}</span>`,
    ].join('');

    const kpiHtml = `<div class="kpis">
      <div class="kpi"><div class="kpi-val">${Math.round(report.overallPct)}%</div><div class="kpi-lbl">Overall attendance</div></div>
      <div class="kpi"><div class="kpi-val">${report.totalEnrolled}</div><div class="kpi-lbl">Enrolled</div></div>
      <div class="kpi"><div class="kpi-val">${report.belowThreshold}</div><div class="kpi-lbl">Below 70%</div></div>
      <div class="kpi"><div class="kpi-val">${report.engagementScore}</div><div class="kpi-lbl">Engagement score</div></div>
    </div>`;

    const header = `<tr>${['Student','Present','Late','Absent','Excused','Att %','Risk']
      .map((h) => `<th>${h}</th>`).join('')}</tr>`;
    const bodyRows = report.students.map(
      (s) =>
        `<tr><td>${s.name}</td><td>${s.present}</td><td>${s.late}</td><td>${s.absent}</td><td>${s.excused}</td><td>${Math.round(s.pct)}%</td><td class="${s.risk}">${s.risk}</td></tr>`
    ).join('');

    openPrint(
      `Course Attendance Report — ${report.courseName} ${report.classLabel}`,
      metaHtml,
      `${kpiHtml}<h2>Student roster</h2><table><thead>${header}</thead><tbody>${bodyRows}</tbody></table>`
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Course Attendance Report
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Overall course-level attendance analytics with trend, risk distribution and engagement scoring
        </p>
      </div>

      {/* Filter card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={16} /> Report Configuration
          </CardTitle>
          <CardDescription>Select a course and class to generate the full performance report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                onFocus={loadFilterOptions}
              >
                <option value="">— Select course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.course_id} · {c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class / Section</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                onFocus={loadFilterOptions}
              >
                <option value="">— Select class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>Year {c.year} · Section {c.section}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button className="mt-4" onClick={generate} disabled={loading}>
            {loading ? (
              <><RefreshCw size={14} className="mr-2 animate-spin" /> Generating…</>
            ) : (
              <><BarChart2 size={14} className="mr-2" /> Generate Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {loading && <ReportSkeleton />}

      {!loading && report && (
        <>
          {/* Branded header */}
          <div className="rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-700 text-white px-6 py-5 flex flex-wrap gap-4 justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">
                Course Attendance Performance Report
              </p>
              <h2 className="text-xl font-black leading-tight">
                {report.courseName}
                {report.courseCode && (
                  <span className="ml-2 text-sm font-semibold opacity-70">({report.courseCode})</span>
                )}
              </h2>
              <p className="text-sm opacity-75 mt-0.5">{report.classLabel}</p>
              <p className="text-xs opacity-50 mt-1">
                {report.totalSessions} sessions · {report.totalEnrolled} students ·
                Generated {report.generatedAt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={exporting} onClick={doExportCsv}>
                <Download size={13} className="mr-1" /> Excel CSV
              </Button>
              <Button size="sm" variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={exporting} onClick={doExportPdf}>
                <FileText size={13} className="mr-1" /> PDF
              </Button>
              <Button size="sm" variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={doPrint}>
                <Printer size={13} className="mr-1" /> Print
              </Button>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Target size={13} /> Overall attendance
                </CardDescription>
                <CardTitle className="text-3xl font-black">{Math.round(report.overallPct)}%</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-slate-500">
                Avg per-student: {Math.round(report.avgPct)}%
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Users size={13} /> Enrollment
                </CardDescription>
                <CardTitle className="text-3xl font-black">{report.totalEnrolled}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-slate-500">
                {report.activeStudents} actively participating
              </CardContent>
            </Card>

            <Card className="shadow-sm border-red-100">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1 text-red-600">
                  <AlertTriangle size={13} /> Below threshold
                </CardDescription>
                <CardTitle className="text-3xl font-black text-red-600">
                  {report.belowThreshold}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-slate-500">
                Students under 70% attendance
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Flame size={13} /> Engagement score
                </CardDescription>
                <CardTitle className={`text-3xl font-black ${scoreColour(report.engagementScore)}`}>
                  {report.engagementScore}
                  <span className="text-sm font-semibold text-slate-400">/100</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-slate-500">
                {scoreLabel(report.engagementScore)} — blends attendance &amp; consistency
              </CardContent>
            </Card>
          </div>

          {/* Health indicators row */}
          <div className="grid gap-3 sm:grid-cols-3">
            {report.best && (
              <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                <CardContent className="pt-5 flex items-center gap-3">
                  <CheckCircle size={28} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Highest attendance</p>
                    <p className="font-bold text-slate-800 truncate">{report.best.name}</p>
                    <p className="text-sm text-emerald-700 font-black">{Math.round(report.best.pct)}%</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {report.worst && (
              <Card className="shadow-sm border-red-100 bg-red-50/30">
                <CardContent className="pt-5 flex items-center gap-3">
                  <TrendingDown size={28} className="text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Lowest attendance</p>
                    <p className="font-bold text-slate-800 truncate">{report.worst.name}</p>
                    <p className="text-sm text-red-700 font-black">{Math.round(report.worst.pct)}%</p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="shadow-sm">
              <CardContent className="pt-5 flex items-center gap-3">
                <Activity size={28} className="text-indigo-500 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                    Sessions tracked
                  </p>
                  <p className="text-2xl font-black text-slate-800">{report.totalSessions}</p>
                  <p className="text-xs text-slate-500">Finished sessions in range</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {timelineChart && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attendance trend</CardTitle>
                  <CardDescription>
                    Session-by-session attendance rate · dashed line = 70% threshold
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <Line data={timelineChart} options={baseChartOpts} />
                </CardContent>
              </Card>
            )}
            {riskChart && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk distribution</CardTitle>
                  <CardDescription>Students grouped by attendance risk level</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <Doughnut data={riskChart} options={donutOpts} />
                </CardContent>
              </Card>
            )}
          </div>

          {topStudentsChart && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 performers</CardTitle>
                <CardDescription>Colour indicates risk level</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <Bar data={topStudentsChart} options={baseChartOpts} />
              </CardContent>
            </Card>
          )}

          {/* Student roster with risk filter */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Student roster</CardTitle>
                  <CardDescription>
                    {visibleStudents.length} students · filter by risk level
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'high', 'medium', 'low'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRiskFilter(r)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        riskFilter === r
                          ? r === 'high'
                            ? 'bg-red-600 text-white border-red-600'
                            : r === 'medium'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : r === 'low'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {r === 'all' ? 'All' : r === 'high' ? 'High risk' : r === 'medium' ? 'Medium risk' : 'Low risk'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      {['Student', 'Present', 'Late', 'Absent', 'Excused', 'Attendance', 'Risk'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                          No students in this risk category.
                        </td>
                      </tr>
                    ) : (
                      visibleStudents.map((s) => (
                        <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                          <td className="px-4 py-3 text-emerald-700 font-semibold">{s.present}</td>
                          <td className="px-4 py-3 text-amber-700">{s.late}</td>
                          <td className="px-4 py-3 text-red-600">{s.absent}</td>
                          <td className="px-4 py-3 text-blue-600">{s.excused}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-[110px]">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    s.pct >= 75 ? 'bg-emerald-500' : s.pct >= 65 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold tabular-nums w-9 text-right">
                                {Math.round(s.pct)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {s.risk === 'high' ? (
                              <Badge variant="destructive" className="text-[10px]">High</Badge>
                            ) : s.risk === 'medium' ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Medium
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Low
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !report && !error && (
        <div className="text-center py-20 text-slate-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Select a course and class, then click Generate Report.</p>
        </div>
      )}
    </div>
  );
}
