import { useState } from 'react';
import { api } from '../../api';
import type { Session } from '../../api';
import type { AttendanceRecordWithStudent, Course, Class } from '../../api';
import './Reports.css';

type TimePeriod = 'all' | 'completed';
type ExportFormat = 'csv' | 'json';

function isCompletedStatus(status: string) {
  return status === 'finished' || status === 'completed';
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-3)}` : id;
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

function toCSV(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) return '';
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach(k => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escape = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headerLine = headers.map(escape).join(',');
  const lines = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

async function enrichSessions(sessions: Session[]) {
  const courseIds = Array.from(new Set(sessions.map(s => s.course_id)));
  const classIds = Array.from(new Set(sessions.map(s => s.class_id)));

  const coursesById = new Map<string, Course>();
  const classesById = new Map<string, Class>();

  await Promise.all(
    courseIds.map(async id => {
      try {
        const c = await api.courseDetails(id);
        coursesById.set(id, c);
      } catch {
        // Ignore per-item failures so one missing course doesn't break report generation.
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

  return { coursesById, classesById };
}

function attendanceStatsFromRecords(records: AttendanceRecordWithStudent[]) {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, attendancePct };
}

export default function Reports() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<{ name: string; at: string }>>([]);

  const loadBaseSessions = async () => {
    const all = await api.allSessions();
    if (timePeriod === 'completed') return all.filter(s => isCompletedStatus(s.status));
    return all;
  };

  const exportDepartmentAttendanceSummary = async () => {
    setError(null);
    setBusy(true);
    try {
      const sessions = await loadBaseSessions();
      await enrichSessions(sessions);

      // Cap for responsiveness; still based on real backend data.
      const slice = sessions.slice(0, 40);

      const recordsBySession = await Promise.all(
        slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
      );

      const sessionAttendance = slice.map((s, i) => {
        const recs = recordsBySession[i];
        const st = attendanceStatsFromRecords(recs);
        return { session: s, ...st };
      });

      const totalRecords = sessionAttendance.reduce((sum, s) => sum + s.total, 0);
      const totalPresent = sessionAttendance.reduce((sum, s) => sum + s.present, 0);
      const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

      const completionRate =
        sessions.length > 0
          ? Math.round((sessions.filter(s => isCompletedStatus(s.status)).length / sessions.length) * 100)
          : 0;

      const distribution = {
        excellent: sessionAttendance.filter(s => s.attendancePct >= 90).length,
        good: sessionAttendance.filter(s => s.attendancePct >= 80 && s.attendancePct < 90).length,
        fair: sessionAttendance.filter(s => s.attendancePct >= 70 && s.attendancePct < 80).length,
        poor: sessionAttendance.filter(s => s.attendancePct < 70).length,
      };

      const outRows = [
        { metric: 'Total Sessions', value: sessions.length },
        { metric: 'Export Sessions (capped)', value: slice.length },
        { metric: 'Total Records', value: totalRecords },
        { metric: 'Present Count', value: totalPresent },
        { metric: 'Avg Attendance (%)', value: avgAttendance },
        { metric: 'Completion Rate (%)', value: completionRate },
        { metric: 'Excellent Sessions (>=90%)', value: distribution.excellent },
        { metric: 'Good Sessions (80-89%)', value: distribution.good },
        { metric: 'Fair Sessions (70-79%)', value: distribution.fair },
        { metric: 'Poor Sessions (<70%)', value: distribution.poor },
      ];

      const name = `department_attendance_summary_${timePeriod}_${Date.now()}`;
      if (exportFormat === 'json') {
        downloadText(`${name}.json`, JSON.stringify({ timePeriod, out: outRows }, null, 2), 'application/json');
      } else {
        downloadText(`${name}.csv`, toCSV(outRows), 'text/csv');
      }

      setRecent(prev => [{ name, at: new Date().toISOString() }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setBusy(false);
    }
  };

  const exportCoursePerformanceReport = async () => {
    setError(null);
    setBusy(true);
    try {
      const sessions = await loadBaseSessions();
      const completed = sessions.filter(s => isCompletedStatus(s.status));
      const slice = completed.slice(0, 40);

      const recordsBySession = await Promise.all(
        slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
      );

      const byCourse = new Map<
        string,
        { course_id: string; present: number; total: number; sessions: number }
      >();

      for (let i = 0; i < slice.length; i++) {
        const s = slice[i];
        const recs = recordsBySession[i];
        const st = attendanceStatsFromRecords(recs);
        if (!byCourse.has(s.course_id)) {
          byCourse.set(s.course_id, { course_id: s.course_id, present: 0, total: 0, sessions: 0 });
        }
        const entry = byCourse.get(s.course_id)!;
        entry.present += st.present;
        entry.total += st.total;
        entry.sessions += 1;
      }

      const courseIds = Array.from(byCourse.keys());
      const courses = await Promise.all(
        courseIds.map(id => api.courseDetails(id).catch(() => undefined as Course | undefined))
      );

      const rows = courseIds.map((id, i) => {
        const c = courses[i];
        const entry = byCourse.get(id)!;
        return {
          course: c?.name ?? id,
          course_id: id,
          attendancePercent: entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
          sessions: entry.sessions,
        };
      });

      const name = `course_performance_${timePeriod}_${Date.now()}`;
      if (exportFormat === 'json') {
        downloadText(`${name}.json`, JSON.stringify({ timePeriod, rows }, null, 2), 'application/json');
      } else {
        downloadText(`${name}.csv`, toCSV(rows), 'text/csv');
      }

      setRecent(prev => [{ name, at: new Date().toISOString() }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setBusy(false);
    }
  };

  const exportStaffPlanningReport = async () => {
    setError(null);
    setBusy(true);
    try {
      const sessions = await loadBaseSessions();
      const completed = sessions.filter(s => isCompletedStatus(s.status));
      const slice = completed.slice(0, 40);

      const recordsBySession = await Promise.all(
        slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
      );

      const byInstructor = new Map<
        string,
        { instructor_id: string; activeSessions: number; completedSessions: number; present: number; total: number }
      >();

      // Active sessions per instructor across the (un-capped) fetched set
      const activeByInstructor = new Map<string, number>();
      for (const s of sessions) {
        if (s.status === 'active') activeByInstructor.set(s.instructor_id, (activeByInstructor.get(s.instructor_id) ?? 0) + 1);
      }

      for (let i = 0; i < slice.length; i++) {
        const s = slice[i];
        const recs = recordsBySession[i];
        const st = attendanceStatsFromRecords(recs);
        if (!byInstructor.has(s.instructor_id)) {
          byInstructor.set(s.instructor_id, {
            instructor_id: s.instructor_id,
            activeSessions: activeByInstructor.get(s.instructor_id) ?? 0,
            completedSessions: 0,
            present: 0,
            total: 0,
          });
        }
        const entry = byInstructor.get(s.instructor_id)!;
        entry.present += st.present;
        entry.total += st.total;
        entry.completedSessions += 1;
      }

      const rows = Array.from(byInstructor.values()).map(entry => ({
        instructor: shortId(entry.instructor_id),
        instructor_id: entry.instructor_id,
        role: '—',
        activeSessions: entry.activeSessions,
        completedSessions: entry.completedSessions,
        avgAttendancePercent: entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
      }));

      const name = `staff_planning_${timePeriod}_${Date.now()}`;
      if (exportFormat === 'json') {
        downloadText(`${name}.json`, JSON.stringify({ timePeriod, rows }, null, 2), 'application/json');
      } else {
        downloadText(`${name}.csv`, toCSV(rows), 'text/csv');
      }

      setRecent(prev => [{ name, at: new Date().toISOString() }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setBusy(false);
    }
  };

  const exportAuditEvaluationReport = async () => {
    setError(null);
    setBusy(true);
    try {
      const sessions = await loadBaseSessions();
      const completed = sessions.filter(s => isCompletedStatus(s.status));
      const slice = completed.slice(0, 50);

      const { coursesById, classesById } = await enrichSessions(slice);
      const recordsBySession = await Promise.all(
        slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
      );

      const auditRows = slice.map((s, i) => {
        const recs = recordsBySession[i];
        const st = attendanceStatsFromRecords(recs);
        const course = coursesById.get(s.course_id);
        const cls = classesById.get(s.class_id);
        const classLabel = cls ? `Year ${cls.year} · Section ${cls.section}` : '';
        return {
          session_id: s.id,
          instructor_id: shortId(s.instructor_id),
          course: course?.name ?? s.course_id,
          classLabel,
          attendancePercent: st.attendancePct,
          status: s.status,
          flag: st.attendancePct < 70 ? 'LOW' : '',
        };
      });

      const low = auditRows.filter(r => r.flag === 'LOW').length;

      const name = `audit_evaluation_${timePeriod}_${Date.now()}`;
      const payload =
        exportFormat === 'json'
          ? { timePeriod, lowFlagCount: low, rows: auditRows }
          : null;

      if (exportFormat === 'json') {
        downloadText(`${name}.json`, JSON.stringify(payload, null, 2), 'application/json');
      } else {
        downloadText(`${name}.csv`, toCSV(auditRows), 'text/csv');
      }

      setRecent(prev => [{ name, at: new Date().toISOString() }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setBusy(false);
    }
  };

  const canGenerate = !busy;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h2>Reports &amp; Exports</h2>
          <p className="page-sub">Generate attendance and performance reports</p>
        </div>
      </div>

      <div className="reports-card">
        <div className="reports-card-title">Report Configuration</div>
        <div className="reports-form">
          <label className="field">
            <span className="field-label">Time Period</span>
            <select
              className="field-control"
              value={timePeriod}
              onChange={e => setTimePeriod(e.target.value as TimePeriod)}
            >
              <option value="all">All sessions</option>
              <option value="completed">Completed sessions</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Export Format</span>
            <select
              className="field-control"
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as ExportFormat)}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
        </div>

        {error && <div className="reports-error">⚠ {error}</div>}
      </div>

      <div className="reports-grid">
        <ReportTile
          title="Department Attendance Summary"
          description="Comprehensive attendance report across sessions"
          icon="👥"
          onGenerate={exportDepartmentAttendanceSummary}
          disabled={!canGenerate}
        />
        <ReportTile
          title="Course Performance Report"
          description="Attendance vs. participation by course"
          icon="📚"
          onGenerate={exportCoursePerformanceReport}
          disabled={!canGenerate}
        />
        <ReportTile
          title="Staff Planning Report"
          description="Insights for curriculum adjustments and staffing"
          icon="🧑‍🏫"
          onGenerate={exportStaffPlanningReport}
          disabled={!canGenerate}
        />
        <ReportTile
          title="Audit &amp; Evaluation Report"
          description="Compliance and evaluation documentation"
          icon="🧾"
          onGenerate={exportAuditEvaluationReport}
          disabled={!canGenerate}
        />
      </div>

      <div className="reports-recent">
        <div className="reports-card-title">Recent Reports</div>
        <div className="recent-list">
          {recent.length === 0 ? (
            <div className="empty-row">No reports generated yet</div>
          ) : (
            recent.map(r => (
              <div key={r.name} className="recent-row">
                <div className="recent-name">{r.name}</div>
                <div className="recent-at">{new Date(r.at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ReportTile({
  title,
  description,
  icon,
  onGenerate,
  disabled,
}: {
  title: string;
  description: string;
  icon: string;
  onGenerate: () => Promise<void>;
  disabled: boolean;
}) {
  return (
    <div className="report-tile">
      <div className="report-tile-top">
        <div className="report-icon">{icon}</div>
        <div className="report-title">{title}</div>
      </div>
      <div className="report-desc">{description}</div>
      <button className="report-btn" disabled={disabled} onClick={onGenerate} type="button">
        <span className="report-btn-icon">⬇</span>
        Generate Report
      </button>
    </div>
  );
}

