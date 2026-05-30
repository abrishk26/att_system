import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { api } from '../../api';
import type { AttendanceRecordWithStudent, Course, Class, Session } from '../../api';
import { exportToPDF, exportToExcelFriendlyCsv } from '../../lib/exportUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Input } from '../../components/ui/input';
import {
  Download,
  FileText,
  Printer,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Users,
  Calendar,
  BarChart2,
  RefreshCw,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentRow {
  student_id: string;
  username: string;
  first_name: string;
  last_name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  pct: number;
  status: 'excellent' | 'warning' | 'critical';
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

type SortKey = keyof StudentRow;
type SortDir = 'asc' | 'desc';

// ── Helpers ────────────────────────────────────────────────────────────────────

function attendanceStatus(pct: number): StudentRow['status'] {
  if (pct >= 85) return 'excellent';
  if (pct >= 70) return 'warning';
  return 'critical';
}

function statusBadge(s: StudentRow['status']) {
  if (s === 'excellent')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle size={10} /> Excellent
      </span>
    );
  if (s === 'warning')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle size={10} /> Warning
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
      <TrendingDown size={10} /> Critical
    </span>
  );
}

function trendIcon(t: StudentRow['trend']) {
  if (t === 'up') return <ChevronUp size={14} className="text-emerald-500" />;
  if (t === 'down') return <ChevronDown size={14} className="text-red-500" />;
  return <span className="text-slate-300 text-sm">—</span>;
}

function pctBar(pct: number) {
  const colour =
    pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full transition-all ${colour}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-9 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 mt-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

// ── Print ──────────────────────────────────────────────────────────────────────

function openPrint(title: string, metaHtml: string, tableHtml: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;padding:2rem;color:#0f172a;max-width:1100px;margin:0 auto}
    h1{font-size:1.4rem;margin:0 0 0.25rem;font-weight:800}
    .meta{color:#64748b;font-size:0.8rem;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:1rem}
    .meta span{background:#f1f5f9;padding:2px 8px;border-radius:4px}
    table{width:100%;border-collapse:collapse;font-size:0.8rem}
    th{background:#1e293b;color:#fff;padding:8px 10px;text-align:left;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:.05em}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .excellent{color:#059669;font-weight:700} .warning{color:#d97706;font-weight:700} .critical{color:#dc2626;font-weight:700}
    @media print{body{padding:0.5rem}}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">${metaHtml}</div>
  ${tableHtml}
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

// ── Main component ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function StudentAttendanceReport() {
  // Filters
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Loaded lookup data
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  // Report data
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [reportMeta, setReportMeta] = useState<{
    courseName: string;
    classLabel: string;
    totalSessions: number;
    generatedAt: string;
  } | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Load filter options once ───────────────────────────────────────────────

  const loadFilterOptions = useCallback(async () => {
    if (coursesLoaded) return;
    try {
      const sessions = await api.allSessions();
      const uniqueCourseIds = [...new Set(sessions.map((s) => s.course_id))];
      const uniqueClassIds = [...new Set(sessions.map((s) => s.class_id))];

      const [loadedCourses, loadedClasses] = await Promise.all([
        Promise.all(
          uniqueCourseIds.map((id) => api.courseDetails(id).catch(() => null))
        ),
        Promise.all(
          uniqueClassIds.map((id) => api.classDetails(id).catch(() => null))
        ),
      ]);

      setCourses(loadedCourses.filter(Boolean) as Course[]);
      setClasses(loadedClasses.filter(Boolean) as Class[]);
      setCoursesLoaded(true);
    } catch {
      // silently — user can still type IDs
    }
  }, [coursesLoaded]);

  // ── Generate report ────────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!courseId || !classId) {
      setError('Please select both a course and a class/section.');
      return;
    }
    setError('');
    setLoading(true);
    setRows([]);
    setReportMeta(null);

    try {
      // 1. Fetch all sessions and filter
      const allSessions: Session[] = await api.allSessions();
      let filtered = allSessions.filter(
        (s) =>
          s.course_id === courseId &&
          s.class_id === classId &&
          s.status === 'finished'
      );

      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00.000Z');
        filtered = filtered.filter((s) => new Date(s.created_at) >= from);
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59.999Z');
        filtered = filtered.filter((s) => new Date(s.created_at) <= to);
      }

      if (filtered.length === 0) {
        setError('No finished sessions found for the selected filters.');
        setLoading(false);
        return;
      }

      // 2. Sort sessions by date for trend calculation
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // 3. Fetch attendance records
      const recordsBySession = await Promise.all(
        filtered.map((s) =>
          api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[])
        )
      );

      // 4. Aggregate per student
      const studentMap = new Map<
        string,
        {
          username: string;
          first_name: string;
          last_name: string;
          present: number;
          late: number;
          absent: number;
          excused: number;
          // session-by-session attendance for trend: 1 = engaged, 0 = not
          timeline: number[];
        }
      >();

      filtered.forEach((_, si) => {
        const recs = recordsBySession[si];
        recs.forEach((r) => {
          if (!studentMap.has(r.student_id)) {
            const parts = r.student_name.split(' ');
            studentMap.set(r.student_id, {
              username: r.nfc_id, // best we have without another round-trip
              first_name: parts[0] ?? '',
              last_name: parts.slice(1).join(' '),
              present: 0,
              late: 0,
              absent: 0,
              excused: 0,
              timeline: [],
            });
          }
          const entry = studentMap.get(r.student_id)!;
          if (r.status === 'present') { entry.present++; entry.timeline.push(1); }
          else if (r.status === 'late') { entry.late++; entry.timeline.push(1); }
          else if (r.status === 'absent') { entry.absent++; entry.timeline.push(0); }
          else if (r.status === 'excused') { entry.excused++; entry.timeline.push(1); }
        });
      });

      // 5. Build rows
      const built: Omit<StudentRow, 'rank'>[] = Array.from(studentMap.entries()).map(
        ([sid, s]) => {
          const total = s.present + s.late + s.absent + s.excused;
          const engaged = s.present + s.late + s.excused;
          const pct = total > 0 ? (engaged / total) * 100 : 0;

          // Trend: compare last 3 vs first 3 sessions
          const tl = s.timeline;
          let trend: StudentRow['trend'] = 'stable';
          if (tl.length >= 6) {
            const firstHalf = tl.slice(0, Math.floor(tl.length / 2));
            const secondHalf = tl.slice(Math.floor(tl.length / 2));
            const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
            const diff = avg(secondHalf) - avg(firstHalf);
            if (diff > 0.1) trend = 'up';
            else if (diff < -0.1) trend = 'down';
          }

          return {
            student_id: sid,
            username: s.username,
            first_name: s.first_name,
            last_name: s.last_name,
            total,
            present: s.present,
            late: s.late,
            absent: s.absent,
            excused: s.excused,
            pct,
            status: attendanceStatus(pct),
            trend,
          };
        }
      );

      // 6. Rank by pct descending
      built.sort((a, b) => b.pct - a.pct);
      const ranked: StudentRow[] = built.map((r, i) => ({ ...r, rank: i + 1 }));

      // 7. Metadata
      const courseObj = courses.find((c) => c.id === courseId);
      const classObj = classes.find((c) => c.id === classId);
      setReportMeta({
        courseName: courseObj?.name ?? courseId.slice(0, 8),
        classLabel: classObj ? `Year ${classObj.year} · Section ${classObj.section}` : classId.slice(0, 8),
        totalSessions: filtered.length,
        generatedAt: new Date().toLocaleString(),
      });

      setRows(ranked);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [courseId, classId, dateFrom, dateTo, courses, classes]);

  // ── Derived / filtered rows ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let r = rows.filter(
      (s) =>
        !q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q)
    );
    r = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return r;
  }, [rows, search, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    if (!rows.length) return null;
    const avg = rows.reduce((a, r) => a + r.pct, 0) / rows.length;
    const excellent = rows.filter((r) => r.status === 'excellent').length;
    const warning = rows.filter((r) => r.status === 'warning').length;
    const critical = rows.filter((r) => r.status === 'critical').length;
    const best = rows[0];
    const worst = rows[rows.length - 1];
    return { avg, excellent, warning, critical, best, worst };
  }, [rows]);

  // ── Sorting helper ─────────────────────────────────────────────────────────

  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    ) : (
      <ChevronDown size={12} className="opacity-20" />
    );

  // ── Export helpers ─────────────────────────────────────────────────────────

  const exportRows = useMemo(
    () =>
      filtered.map((r) => ({
        Rank: r.rank,
        'First Name': r.first_name,
        'Last Name': r.last_name,
        'NFC / Username': r.username,
        'Total Sessions': r.total,
        Present: r.present,
        Late: r.late,
        Absent: r.absent,
        Excused: r.excused,
        'Attendance %': Math.round(r.pct * 10) / 10,
        Status: r.status,
        Trend: r.trend,
      })),
    [filtered]
  );

  const stamp = () =>
    reportMeta
      ? `${reportMeta.courseName.replace(/\s+/g, '_')}_${Date.now()}`
      : `student_report_${Date.now()}`;

  const doExportCsv = async () => {
    setExporting(true);
    exportToExcelFriendlyCsv(exportRows, stamp());
    setExporting(false);
  };

  const doExportPdf = async () => {
    setExporting(true);
    const cols = [
      { header: '#', dataKey: 'Rank' },
      { header: 'First Name', dataKey: 'First Name' },
      { header: 'Last Name', dataKey: 'Last Name' },
      { header: 'Present', dataKey: 'Present' },
      { header: 'Late', dataKey: 'Late' },
      { header: 'Absent', dataKey: 'Absent' },
      { header: 'Excused', dataKey: 'Excused' },
      { header: 'Att %', dataKey: 'Attendance %' },
      { header: 'Status', dataKey: 'Status' },
    ];
    const pdfRows = exportRows.map((r) => {
      const o: Record<string, string | number | null | undefined> = {};
      for (const [k, v] of Object.entries(r)) o[k] = v;
      return o;
    });
    exportToPDF(
      `Student Attendance — ${reportMeta?.courseName ?? ''} ${reportMeta?.classLabel ?? ''}`,
      cols,
      pdfRows,
      stamp()
    );
    setExporting(false);
  };

  const doPrint = () => {
    if (!reportMeta) return;
    const metaHtml = [
      `<span>Course: ${reportMeta.courseName}</span>`,
      `<span>Class: ${reportMeta.classLabel}</span>`,
      `<span>Sessions: ${reportMeta.totalSessions}</span>`,
      `<span>Generated: ${reportMeta.generatedAt}</span>`,
    ].join('');
    const header = `<tr>${['#','First Name','Last Name','Present','Late','Absent','Excused','Att %','Status','Trend']
      .map((h) => `<th>${h}</th>`).join('')}</tr>`;
    const bodyRows = filtered
      .map(
        (r) =>
          `<tr><td>${r.rank}</td><td>${r.first_name}</td><td>${r.last_name}</td><td>${r.present}</td><td>${r.late}</td><td>${r.absent}</td><td>${r.excused}</td><td class="${r.status}">${Math.round(r.pct)}%</td><td class="${r.status}">${r.status}</td><td>${r.trend}</td></tr>`
      )
      .join('');
    openPrint(
      `Student Attendance Report — ${reportMeta.courseName} ${reportMeta.classLabel}`,
      metaHtml,
      `<table><thead>${header}</thead><tbody>${bodyRows}</tbody></table>`
    );
  };

  // ── Chart data ─────────────────────────────────────────────────────────────

  const distributionChart = useMemo(() => {
    if (!kpi) return null;
    return {
      labels: ['Excellent (≥85%)', 'Warning (70–84%)', 'Critical (<70%)'],
      datasets: [
        {
          data: [kpi.excellent, kpi.warning, kpi.critical],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [kpi]);

  const topBottomChart = useMemo(() => {
    if (!rows.length) return null;
    const top5 = rows.slice(0, 5);
    const bottom5 = [...rows].reverse().slice(0, 5).reverse();
    const combined = [...top5, ...bottom5];
    const uniq = combined.filter(
      (r, i, arr) => arr.findIndex((x) => x.student_id === r.student_id) === i
    );
    return {
      labels: uniq.map((r) => `${r.first_name} ${r.last_name}`.trim() || r.username),
      datasets: [
        {
          label: 'Attendance %',
          data: uniq.map((r) => Math.round(r.pct * 10) / 10),
          backgroundColor: uniq.map((r) =>
            r.status === 'excellent' ? '#10b981' : r.status === 'warning' ? '#f59e0b' : '#ef4444'
          ),
          borderRadius: 6,
        },
      ],
    };
  }, [rows]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: '#64748b', maxRotation: 40 }, grid: { color: '#e2e8f0' } },
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#64748b' },
        grid: { color: '#e2e8f0' },
      },
    },
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#475569', boxWidth: 12, font: { size: 11 } } },
    },
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Student Attendance Report
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Per-student breakdown for a course &amp; section — enriched from the academic registry
        </p>
      </div>

      {/* ── Filter card ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={16} /> Report Filters
          </CardTitle>
          <CardDescription>Select course, class and optional date range, then generate.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Course */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Course
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                onFocus={loadFilterOptions}
              >
                <option value="">— Select course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_id} · {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class / section */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Class / Section
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                onFocus={loadFilterOptions}
              >
                <option value="">— Select class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Year {c.year} · Section {c.section}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                From date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                To date
              </label>
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

          <Button
            className="mt-4"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="mr-2 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <BarChart2 size={14} className="mr-2" /> Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <KpiSkeleton />
          <TableSkeleton />
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {!loading && rows.length > 0 && reportMeta && (
        <>
          {/* Report header strip */}
          <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 text-white px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">
                Student Attendance Intelligence Report
              </p>
              <h2 className="text-lg font-black leading-tight">
                {reportMeta.courseName} — {reportMeta.classLabel}
              </h2>
              <p className="text-xs opacity-60 mt-1">
                {reportMeta.totalSessions} sessions · {rows.length} students ·
                Generated {reportMeta.generatedAt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={exporting}
                onClick={doExportCsv}
              >
                <Download size={13} className="mr-1" /> Excel CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={exporting}
                onClick={doExportPdf}
              >
                <FileText size={13} className="mr-1" /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={doPrint}
              >
                <Printer size={13} className="mr-1" /> Print
              </Button>
            </div>
          </div>

          {/* KPI cards */}
          {kpi && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Users size={13} /> Students enrolled
                  </CardDescription>
                  <CardTitle className="text-3xl font-black">{rows.length}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500 pt-0">
                  Across {reportMeta.totalSessions} finished sessions
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>Class average</CardDescription>
                  <CardTitle className="text-3xl font-black">
                    {Math.round(kpi.avg)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {pctBar(kpi.avg)}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-emerald-100">
                <CardHeader className="pb-2">
                  <CardDescription>Top performer</CardDescription>
                  <CardTitle className="text-lg font-black truncate">
                    {kpi.best.first_name} {kpi.best.last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-slate-500">
                  {Math.round(kpi.best.pct)}% attendance
                </CardContent>
              </Card>

              <Card className="shadow-sm border-red-100">
                <CardHeader className="pb-2">
                  <CardDescription>Needs attention</CardDescription>
                  <CardTitle className="text-lg font-black truncate">
                    {kpi.worst.first_name} {kpi.worst.last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-slate-500">
                  {Math.round(kpi.worst.pct)}% attendance
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status counts */}
          {kpi && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                <CardContent className="pt-5 flex items-center gap-3">
                  <CheckCircle size={28} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-emerald-700">{kpi.excellent}</p>
                    <p className="text-xs text-emerald-600 font-semibold">Excellent (≥85%)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-amber-100 bg-amber-50/30">
                <CardContent className="pt-5 flex items-center gap-3">
                  <AlertTriangle size={28} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-amber-700">{kpi.warning}</p>
                    <p className="text-xs text-amber-600 font-semibold">Warning (70–84%)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-red-100 bg-red-50/30">
                <CardContent className="pt-5 flex items-center gap-3">
                  <TrendingDown size={28} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-red-700">{kpi.critical}</p>
                    <p className="text-xs text-red-600 font-semibold">Critical (&lt;70%)</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            {distributionChart && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attendance distribution</CardTitle>
                  <CardDescription>Students by bracket</CardDescription>
                </CardHeader>
                <CardContent className="h-56">
                  <Doughnut data={distributionChart} options={donutOpts} />
                </CardContent>
              </Card>
            )}
            {topBottomChart && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top &amp; bottom performers</CardTitle>
                  <CardDescription>Individual attendance percentage</CardDescription>
                </CardHeader>
                <CardContent className="h-56">
                  <Bar data={topBottomChart} options={chartOpts} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table */}
          <Card ref={tableRef}>
            <CardHeader>
              <div className="flex flex-wrap gap-3 items-start justify-between">
                <div>
                  <CardTitle className="text-base">Student roster</CardTitle>
                  <CardDescription>
                    {filtered.length} students · sorted by{' '}
                    <span className="font-semibold">{sortKey}</span>
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Search students…"
                    className="pl-8 h-8 w-52 text-sm"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      {(
                        [
                          ['rank', '#'],
                          ['first_name', 'First name'],
                          ['last_name', 'Last name'],
                          ['present', 'Present'],
                          ['late', 'Late'],
                          ['absent', 'Absent'],
                          ['excused', 'Excused'],
                          ['pct', 'Attendance'],
                          ['status', 'Status'],
                          ['trend', 'Trend'],
                        ] as [SortKey, string][]
                      ).map(([k, label]) => (
                        <th
                          key={k}
                          className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-primary transition-colors whitespace-nowrap"
                          onClick={() => handleSort(k)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {label} <SortIcon col={k} />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="text-center py-12 text-slate-400 text-sm"
                        >
                          No students match your search.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((r) => (
                        <tr
                          key={r.student_id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                            {r.rank}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {r.first_name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{r.last_name}</td>
                          <td className="px-4 py-3 text-emerald-700 font-semibold">
                            {r.present}
                          </td>
                          <td className="px-4 py-3 text-amber-700">{r.late}</td>
                          <td className="px-4 py-3 text-red-600">{r.absent}</td>
                          <td className="px-4 py-3 text-blue-600">{r.excused}</td>
                          <td className="px-4 py-3">{pctBar(r.pct)}</td>
                          <td className="px-4 py-3">{statusBadge(r.status)}</td>
                          <td className="px-4 py-3">{trendIcon(r.trend)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Page {page} of {totalPages} · {filtered.length} students
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state — report generated but no data */}
      {!loading && rows.length === 0 && reportMeta === null && !error && (
        <div className="text-center py-20 text-slate-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Select a course and class, then click Generate Report.</p>
        </div>
      )}
    </div>
  );
}
