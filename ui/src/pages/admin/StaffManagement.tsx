import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { AttendanceRecordWithStudent } from '../../api';
import './StaffManagement.css';

type StatusFilter = 'all' | 'active';

function isCompletedStatus(status: string) {
  return status === 'finished' || status === 'completed';
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-3)}` : id;
}

function csvEscape(v: unknown) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach(k => set.add(k));
      return set;
    }, new Set<string>())
  );
  const headerLine = headers.map(csvEscape).join(',');
  const lines = rows.map(r => headers.map(h => csvEscape(r[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function attendanceStatsFromRecords(records: AttendanceRecordWithStudent[]) {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, attendancePct };
}

type StaffRow = {
  instructor_id: string;
  name: string;
  role: string;
  department: string;
  coursesCount: number;
  activeToday: boolean;
  completedSessions: number;
  avgPerformancePercent: number | null;
};

export default function StaffManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessions = await api.allSessions();

        const instructorIds = Array.from(new Set(sessions.map(s => s.instructor_id)));
        const activeSet = new Set(sessions.filter(s => s.status === 'active').map(s => s.instructor_id));
        const completed = sessions.filter(s => isCompletedStatus(s.status));

        // Courses count: derived from the fetched sessions dataset.
        const coursesByInstructor = new Map<string, Set<string>>();
        for (const s of sessions) {
          if (!coursesByInstructor.has(s.instructor_id)) coursesByInstructor.set(s.instructor_id, new Set());
          coursesByInstructor.get(s.instructor_id)!.add(s.course_id);
        }

        // Performance: derived from record attendance in completed sessions (capped for responsiveness).
        const perfSlice = completed.slice(0, 60);
        const recordsBySession = await Promise.all(
          perfSlice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
        );

        const byInstructorPerf = new Map<
          string,
          { instructor_id: string; completedSessions: number; present: number; total: number }
        >();
        for (let i = 0; i < perfSlice.length; i++) {
          const s = perfSlice[i];
          const recs = recordsBySession[i];
          const st = attendanceStatsFromRecords(recs);

          if (!byInstructorPerf.has(s.instructor_id)) {
            byInstructorPerf.set(s.instructor_id, {
              instructor_id: s.instructor_id,
              completedSessions: 0,
              present: 0,
              total: 0,
            });
          }
          const entry = byInstructorPerf.get(s.instructor_id)!;
          entry.completedSessions += 1;
          entry.present += st.present;
          entry.total += st.total;
        }

        const next: StaffRow[] = instructorIds.map(id => {
          const courseSet = coursesByInstructor.get(id);
          const perf = byInstructorPerf.get(id);
          return {
            instructor_id: id,
            name: shortId(id),
            role: '—',
            department: '—',
            coursesCount: courseSet ? courseSet.size : 0,
            activeToday: activeSet.has(id),
            completedSessions: perf?.completedSessions ?? 0,
            avgPerformancePercent: perf && perf.total > 0 ? Math.round((perf.present / perf.total) * 100) : null,
          };
        });

        next.sort((a, b) => Number(b.activeToday) - Number(a.activeToday));
        if (mounted) setRows(next);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load staff management');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchesSearch = q.length === 0 ? true : r.name.toLowerCase().includes(q) || r.instructor_id.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' ? true : r.activeToday;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const exportVisible = () => {
    const exportRows = filtered.map(r => ({
      instructor_id: r.instructor_id,
      staff_member: r.name,
      role: r.role,
      department: r.department,
      courses: r.coursesCount,
      activeToday: r.activeToday ? 'yes' : 'no',
      completedSessions: r.completedSessions,
      avgPerformancePercent: r.avgPerformancePercent ?? '',
    }));
    downloadText(`staff_management_${Date.now()}.csv`, toCSV(exportRows), 'text/csv');
  };

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h2>Staff Management</h2>
          <p className="page-sub">Manage faculty and teaching staff across departments</p>
        </div>
        <button className="primary-btn" type="button" disabled>
          + Add Staff Member
        </button>
      </div>

      <div className="staff-toolbar card">
        <div className="toolbar-left">
          <input
            className="toolbar-input"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input className="toolbar-input" placeholder="Department (API not available)" disabled />
        </div>
        <div className="toolbar-right">
          <button className="ghost-btn" type="button" onClick={() => setStatusFilter(s => (s === 'all' ? 'active' : 'all'))}>
            Filters
          </button>
          <button className="ghost-btn" type="button" onClick={exportVisible} disabled={filtered.length === 0}>
            Export
          </button>
        </div>
      </div>

      <div className="staff-table card">
        {loading ? (
          <div className="loading-row">Loading staff…</div>
        ) : error ? (
          <div className="error-row">⚠ {error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-row">No staff matches your filters</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Department</th>
                <th>Courses</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.instructor_id}>
                  <td>
                    <div className="staff-cell">
                      <div className={`avatar ${r.activeToday ? 'avatar-active' : ''}`}>
                        {r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="staff-meta">
                        <div className="staff-name">{r.name}</div>
                        {r.activeToday && <div className="staff-sub">Active Today</div>}
                      </div>
                    </div>
                  </td>
                  <td>{r.role}</td>
                  <td>{r.department}</td>
                  <td>{r.coursesCount} courses</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="staff-summary">
        <SummaryCard title="Total Staff" value={rows.length} hint="Across all instructors" />
        <SummaryCard
          title="Active Today"
          value={rows.filter(r => r.activeToday).length}
          hint="Currently active teaching sessions"
        />
        <SummaryCard
          title="Avg. Performance"
          value={
            rows.length === 0
              ? 0
              : Math.round(
                  rows
                    .map(r => r.avgPerformancePercent)
                    .filter((v): v is number => typeof v === 'number')
                    .reduce((a, b) => a + b, 0) /
                    Math.max(
                      1,
                      rows
                        .map(r => r.avgPerformancePercent)
                        .filter((v): v is number => typeof v === 'number').length
                    )
                )
          }
          hint="Overall attendance performance"
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <div className="summary-card card">
      <div className="summary-title">{title}</div>
      <div className="summary-value">{value}</div>
      <div className="summary-hint">{hint}</div>
    </div>
  );
}

