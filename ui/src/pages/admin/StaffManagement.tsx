import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { UniversityIntelligence } from '../../api';
import './StaffManagement.css';

const PAGE_SIZE = 8;

type InstructorRow = {
  instructor_id: string;
  name: string;
  sessions_total: number;
  sessions_finished: number;
  attendance_rate: number;
  punctuality_index: number;
  completion_proxy: number;
  courses: { course_id: string; course_name?: string; class_label?: string; attendance_rate: number; sessions_finished: number }[];
};

export default function StaffManagement() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorRow | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const intel: UniversityIntelligence = await api.universityAnalytics();

        // Build course/class breakdown per instructor from sections + sessions
        const sessions = await api.allSessions();
        const instructorCourses = new Map<string, Map<string, { course_id: string; class_id: string }>>();
        for (const s of sessions) {
          if (!instructorCourses.has(s.instructor_id)) instructorCourses.set(s.instructor_id, new Map());
          const key = `${s.course_id}__${s.class_id}`;
          instructorCourses.get(s.instructor_id)!.set(key, { course_id: s.course_id, class_id: s.class_id });
        }

        // Index sections by course_id+class_id for enrichment
        const sectionMap = new Map<string, typeof intel.sections[0]>();
        for (const sec of intel.sections) {
          sectionMap.set(`${sec.course_id}__${sec.class_id}`, sec);
        }

        // Index courses by course_id for enrichment
        const courseMap = new Map<string, typeof intel.courses[0]>();
        for (const c of intel.courses) {
          courseMap.set(c.course_id, c);
        }

        const next: InstructorRow[] = intel.instructors.map(i => {
          const pairs = instructorCourses.get(i.instructor_id);
          const courses: InstructorRow['courses'] = [];
          if (pairs) {
            for (const [, pair] of pairs) {
              const sec = sectionMap.get(`${pair.course_id}__${pair.class_id}`);
              const crs = courseMap.get(pair.course_id);
              courses.push({
                course_id: pair.course_id,
                course_name: sec?.course_name ?? crs?.course_name ?? undefined,
                class_label: sec?.class_label ?? undefined,
                attendance_rate: sec?.attendance_rate ?? 0,
                sessions_finished: sec?.sessions_finished ?? 0,
              });
            }
          }
          return {
            instructor_id: i.instructor_id,
            name: i.instructor_name ?? i.instructor_id.slice(0, 8),
            sessions_total: i.sessions_total,
            sessions_finished: i.sessions_finished,
            attendance_rate: i.attendance_rate,
            punctuality_index: i.punctuality_index,
            completion_proxy: i.completion_proxy,
            courses,
          };
        });

        next.sort((a, b) => b.sessions_total - a.sessions_total);
        if (mounted) setRows(next);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load staff data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  // Ensure page stays in bounds
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function rateColor(rate: number) {
    if (rate >= 85) return 'var(--rate-excellent)';
    if (rate >= 70) return 'var(--rate-good)';
    if (rate >= 55) return 'var(--rate-fair)';
    return 'var(--rate-poor)';
  }

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h2>Staff Management</h2>
          <p className="page-sub">Faculty overview &amp; performance insights</p>
        </div>
      </div>

      {/* ── Summary Card (moved above table) ── */}
      <div className="staff-summary">
        <SummaryCard title="Total Staff" value={rows.length} hint="Instructors in the system" icon="👥" />
        <SummaryCard
          title="Total Sessions"
          value={rows.reduce((a, r) => a + r.sessions_total, 0)}
          hint="Across all instructors"
          icon="📋"
        />
        <SummaryCard
          title="Avg. Attendance"
          value={
            rows.length === 0
              ? 0
              : Math.round(
                  rows.reduce((a, r) => a + r.attendance_rate, 0) / rows.length
                )
          }
          hint="Overall attendance rate"
          icon="📊"
          suffix="%"
        />
      </div>

      {/* ── Staff Table ── */}
      <div className="staff-table card">
        {loading ? (
          <div className="loading-row">
            <div className="loading-spinner" />
            Loading staff data…
          </div>
        ) : error ? (
          <div className="error-row">⚠ {error}</div>
        ) : rows.length === 0 ? (
          <div className="empty-row">No staff data available</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Sessions</th>
                  <th>Attendance Rate</th>
                  <th>Punctuality</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(r => (
                  <tr key={r.instructor_id} className="staff-row-hover">
                    <td>
                      <div className="staff-cell">
                        <div className="avatar">{getInitials(r.name)}</div>
                        <div className="staff-meta">
                          <button
                            className="staff-name-btn"
                            type="button"
                            onClick={() => setSelectedInstructor(r)}
                            title="View details"
                          >
                            {r.name}
                          </button>
                          <div className="staff-sub">
                            {r.courses.length} course{r.courses.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="sessions-chip">
                        {r.sessions_finished}<span className="sessions-dim">/{r.sessions_total}</span>
                      </span>
                    </td>
                    <td>
                      <span className="rate-badge" style={{ '--rate-clr': rateColor(r.attendance_rate) } as React.CSSProperties}>
                        {r.attendance_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td>{r.punctuality_index.toFixed(1)}%</td>
                    <td>{r.completion_proxy.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ‹ Prev
                </button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      className={`page-num ${n === page ? 'page-active' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  className="page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedInstructor && (
        <div className="modal-backdrop" onClick={() => setSelectedInstructor(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-avatar">{getInitials(selectedInstructor.name)}</div>
              <div>
                <h3 className="modal-name">{selectedInstructor.name}</h3>
                <p className="modal-id">ID: {selectedInstructor.instructor_id}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedInstructor(null)}>✕</button>
            </div>

            <div className="modal-stats">
              <div className="modal-stat">
                <div className="modal-stat-val">{selectedInstructor.sessions_total}</div>
                <div className="modal-stat-label">Total Sessions</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat-val">{selectedInstructor.sessions_finished}</div>
                <div className="modal-stat-label">Completed</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat-val" style={{ color: rateColor(selectedInstructor.attendance_rate) }}>
                  {selectedInstructor.attendance_rate.toFixed(1)}%
                </div>
                <div className="modal-stat-label">Attendance</div>
              </div>
              <div className="modal-stat">
                <div className="modal-stat-val">{selectedInstructor.punctuality_index.toFixed(1)}%</div>
                <div className="modal-stat-label">Punctuality</div>
              </div>
            </div>

            <div className="modal-section">
              <h4>Courses &amp; Classes</h4>
              {selectedInstructor.courses.length === 0 ? (
                <p className="modal-empty">No course assignments found.</p>
              ) : (
                <table className="table modal-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Class</th>
                      <th>Sessions</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstructor.courses.map((c, idx) => (
                      <tr key={idx}>
                        <td>{c.course_name ?? c.course_id.slice(0, 8)}</td>
                        <td>{c.class_label ?? '—'}</td>
                        <td>{c.sessions_finished}</td>
                        <td>
                          <span
                            className="rate-badge"
                            style={{ '--rate-clr': rateColor(c.attendance_rate) } as React.CSSProperties}
                          >
                            {c.attendance_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, hint, icon, suffix }: { title: string; value: number; hint: string; icon: string; suffix?: string }) {
  return (
    <div className="summary-card card">
      <div className="summary-icon">{icon}</div>
      <div>
        <div className="summary-title">{title}</div>
        <div className="summary-value">{value}{suffix ?? ''}</div>
        <div className="summary-hint">{hint}</div>
      </div>
    </div>
  );
}
