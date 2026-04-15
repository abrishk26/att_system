import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { AttendanceRecordWithStudent, Class, Course, Session } from '../../api';
import './ClassSchedule.css';

type ViewMode = 'day' | 'week';
type StatusFilter = 'all' | 'upcoming' | 'inprogress' | 'completed';

function isCompletedStatus(status: string) {
  return status === 'finished' || status === 'completed';
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-3)}` : id;
}

function attendanceStatsFromRecords(records: AttendanceRecordWithStudent[]) {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, attendancePct };
}

function statusLabel(status: string) {
  if (status === 'incoming') return 'Upcoming';
  if (status === 'active') return 'In Progress';
  if (isCompletedStatus(status)) return 'Completed';
  return status;
}

function statusBadgeClass(status: string) {
  if (status === 'incoming') return 'badge-incoming';
  if (status === 'active') return 'badge-active';
  return 'badge-completed';
}

type ScheduleItem = {
  session_id: string;
  instructor_id: string;
  courseName: string;
  classLabel: string;
  status: string;
  progressPercent: number | null;
};

export default function ClassSchedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessions = await api.allSessions();

        const maxFetch = viewMode === 'day' ? 18 : 30;
        const sorted = [...sessions].sort((a, b) => {
          const prio = (s: Session) => (s.status === 'active' ? 0 : s.status === 'incoming' ? 1 : 2);
          return prio(a) - prio(b);
        });
        const slice = sorted.slice(0, maxFetch);

        const courseIds = Array.from(new Set(slice.map(s => s.course_id)));
        const classIds = Array.from(new Set(slice.map(s => s.class_id)));

        const coursesById = new Map<string, Course>();
        const classesById = new Map<string, Class>();

        await Promise.all(
          courseIds.map(async id => {
            try {
              const c = await api.courseDetails(id);
              coursesById.set(id, c);
            } catch {
              // Ignore per-item failures.
            }
          })
        );

        await Promise.all(
          classIds.map(async id => {
            try {
              const cl = await api.classDetails(id);
              classesById.set(id, cl);
            } catch {
              // Ignore per-item failures.
            }
          })
        );

        const recordsBySession = await Promise.all(
          slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
        );

        const next: ScheduleItem[] = slice.map((s, i) => {
          const recs = recordsBySession[i];
          const st = attendanceStatsFromRecords(recs);
          const course = coursesById.get(s.course_id);
          const cls = classesById.get(s.class_id);
          return {
            session_id: s.id,
            instructor_id: s.instructor_id,
            courseName: course?.name ?? s.course_id,
            classLabel: cls ? `Year ${cls.year} · Section ${cls.section}` : '',
            status: s.status,
            progressPercent: recs.length > 0 ? st.attendancePct : null,
          };
        });

        if (mounted) setItems(next);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load class schedule');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [viewMode]);

  const visible = useMemo(() => {
    return items.filter(it => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'upcoming') return it.status === 'incoming';
      if (statusFilter === 'inprogress') return it.status === 'active';
      if (statusFilter === 'completed') return isCompletedStatus(it.status);
      return true;
    });
  }, [items, statusFilter]);

  const dayCount = 7;
  const weekCount = 14;
  const display = viewMode === 'day' ? visible.slice(0, dayCount) : visible.slice(0, weekCount);

  const allSessionsCounts = useMemo(() => {
    // If items is capped, this is still "derived" from real sessions fetched for the current view.
    const total = items.length;
    const inprogress = items.filter(i => i.status === 'active').length;
    const upcoming = items.filter(i => i.status === 'incoming').length;
    const completed = items.filter(i => isCompletedStatus(i.status)).length;
    return { total, inprogress, upcoming, completed };
  }, [items]);

  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <div>
          <h2>Class Schedule</h2>
          <p className="page-sub">View and manage department class schedules</p>
        </div>

        <div className="schedule-controls">
          <div className="segmented">
            <button type="button" className={viewMode === 'day' ? 'seg-btn active' : 'seg-btn'} onClick={() => setViewMode('day')}>
              Day
            </button>
            <button type="button" className={viewMode === 'week' ? 'seg-btn active' : 'seg-btn'} onClick={() => setViewMode('week')}>
              Week
            </button>
          </div>

          <label className="filter">
            <span className="filter-label">Filter</span>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="inprogress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="schedule-loading">Loading schedule…</div>
      ) : error ? (
        <div className="schedule-error">⚠ {error}</div>
      ) : (
        <div className="schedule-list card">
          {display.length === 0 ? (
            <div className="empty-row">No sessions match the selected filters.</div>
          ) : (
            display.map(it => (
              <div key={it.session_id} className={`schedule-card`}>
                <div className="schedule-card-left">
                  <div className="schedule-time">{statusLabel(it.status)}</div>
                  <div className="schedule-title">{it.courseName}</div>
                  <div className="schedule-meta">
                    <span className="meta-muted">{it.classLabel}</span>
                    <span className="meta-dot">•</span>
                    <span className="meta-muted">Instructor {shortId(it.instructor_id)}</span>
                  </div>
                </div>

                <div className="schedule-card-right">
                  <div className={`badge ${statusBadgeClass(it.status)}`}>{statusLabel(it.status)}</div>
                  <div className="progress-pill">
                    {it.progressPercent === null ? '—' : `${it.progressPercent}%`}
                    <span className="progress-sub">Progress</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="schedule-summary">
        <SummaryStat title="Total Classes Today" value={allSessionsCounts.total} />
        <SummaryStat title="Classes In Progress" value={allSessionsCounts.inprogress} />
        <SummaryStat title="Upcoming Classes" value={allSessionsCounts.upcoming} />
        <SummaryStat title="Completed Classes" value={allSessionsCounts.completed} />
      </div>
    </div>
  );
}

function SummaryStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="summary-stat card">
      <div className="summary-stat-title">{title}</div>
      <div className="summary-stat-value">{value}</div>
    </div>
  );
}

