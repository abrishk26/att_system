import { useState } from 'react';
import { api } from '../../api';
import type { Session } from '../../api';
import type { AttendanceRecordWithStudent, Course, Class } from '../../api';
import { exportToPDF } from '../../lib/exportUtils';
import './Reports.css';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all' | 'completed';
type ExportFormat = 'csv' | 'json' | 'pdf';

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

/** Returns a date N days ago from today */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Filter sessions by time period */
function filterByTimePeriod(sessions: Session[], period: TimePeriod): Session[] {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return sessions.filter(s => new Date(s.created_at) >= startOfDay);
    }
    case 'weekly': {
      const weekAgo = daysAgo(7);
      return sessions.filter(s => new Date(s.created_at) >= weekAgo);
    }
    case 'monthly': {
      const monthAgo = daysAgo(30);
      return sessions.filter(s => new Date(s.created_at) >= monthAgo);
    }
    case 'completed':
      return sessions.filter(s => isCompletedStatus(s.status));
    default:
      return sessions;
  }
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

/** Export helper that supports csv, json, and pdf */
function exportData(
  name: string,
  format: ExportFormat,
  rows: Array<Record<string, any>>,
  pdfTitle?: string,
  pdfColumns?: { header: string; dataKey: string }[],
) {
  if (format === 'json') {
    downloadText(`${name}.json`, JSON.stringify({ rows }, null, 2), 'application/json');
  } else if (format === 'pdf' && pdfTitle && pdfColumns) {
    exportToPDF(pdfTitle, pdfColumns, rows, name);
  } else {
    downloadText(`${name}.csv`, toCSV(rows), 'text/csv');
  }
}

export default function Reports() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<{ name: string; at: string }>>([]);

  const loadBaseSessions = async () => {
    const all = await api.allSessions();
    let filtered = filterByTimePeriod(all, timePeriod);

    // Apply custom date range if specified
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(s => new Date(s.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      filtered = filtered.filter(s => new Date(s.created_at) <= to);
    }

    return filtered;
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
        { Metric: 'Total Sessions', Value: sessions.length },
        { Metric: 'Export Sessions (capped)', Value: slice.length },
        { Metric: 'Total Records', Value: totalRecords },
        { Metric: 'Present Count', Value: totalPresent },
        { Metric: 'Avg Attendance (%)', Value: avgAttendance },
        { Metric: 'Completion Rate (%)', Value: completionRate },
        { Metric: 'Excellent Sessions (>=90%)', Value: distribution.excellent },
        { Metric: 'Good Sessions (80-89%)', Value: distribution.good },
        { Metric: 'Fair Sessions (70-79%)', Value: distribution.fair },
        { Metric: 'Poor Sessions (<70%)', Value: distribution.poor },
      ];

      const name = `department_attendance_summary_${timePeriod}_${Date.now()}`;
      const pdfColumns = [
        { header: 'Metric', dataKey: 'Metric' },
        { header: 'Value', dataKey: 'Value' },
      ];
      exportData(name, exportFormat, outRows, `Department Attendance Summary (${timePeriod})`, pdfColumns);

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
          Course: c?.name ?? id,
          'Course ID': id,
          'Attendance %': entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
          Sessions: entry.sessions,
        };
      });

      const name = `course_performance_${timePeriod}_${Date.now()}`;
      const pdfColumns = [
        { header: 'Course', dataKey: 'Course' },
        { header: 'Attendance %', dataKey: 'Attendance %' },
        { header: 'Sessions', dataKey: 'Sessions' },
      ];
      exportData(name, exportFormat, rows, `Course Performance Report (${timePeriod})`, pdfColumns);

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
        Instructor: shortId(entry.instructor_id),
        'Instructor ID': entry.instructor_id,
        'Active Sessions': entry.activeSessions,
        'Completed Sessions': entry.completedSessions,
        'Avg Attendance %': entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
      }));

      const name = `staff_planning_${timePeriod}_${Date.now()}`;
      const pdfColumns = [
        { header: 'Instructor', dataKey: 'Instructor' },
        { header: 'Active', dataKey: 'Active Sessions' },
        { header: 'Completed', dataKey: 'Completed Sessions' },
        { header: 'Avg Attendance', dataKey: 'Avg Attendance %' },
      ];
      exportData(name, exportFormat, rows, `Staff Planning Report (${timePeriod})`, pdfColumns);

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
          'Session ID': s.id,
          Instructor: shortId(s.instructor_id),
          Course: course?.name ?? s.course_id,
          Class: classLabel,
          'Attendance %': st.attendancePct,
          Status: s.status,
          Flag: st.attendancePct < 70 ? 'LOW' : '',
        };
      });

      const name = `audit_evaluation_${timePeriod}_${Date.now()}`;
      const pdfColumns = [
        { header: 'Course', dataKey: 'Course' },
        { header: 'Class', dataKey: 'Class' },
        { header: 'Attendance %', dataKey: 'Attendance %' },
        { header: 'Status', dataKey: 'Status' },
        { header: 'Flag', dataKey: 'Flag' },
      ];
      exportData(name, exportFormat, auditRows, `Audit & Evaluation Report (${timePeriod})`, pdfColumns);

      setRecent(prev => [{ name, at: new Date().toISOString() }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setBusy(false);
    }
  };

  /** New: Per-student attendance report */
  const exportPerStudentReport = async () => {
    setError(null);
    setBusy(true);
    try {
      const sessions = await loadBaseSessions();
      const completed = sessions.filter(s => isCompletedStatus(s.status));
      const slice = completed.slice(0, 40);

      const recordsBySession = await Promise.all(
        slice.map(s => api.sessionRecords(s.id).catch(() => [] as AttendanceRecordWithStudent[]))
      );

      const studentMap = new Map<string, {
        student_name: string; nfc_id: string; total: number;
        present: number; absent: number; late: number; excused: number;
      }>();

      for (const recs of recordsBySession) {
        for (const rec of recs) {
          if (!studentMap.has(rec.student_id)) {
            studentMap.set(rec.student_id, {
              student_name: rec.student_name, nfc_id: rec.nfc_id,
              total: 0, present: 0, absent: 0, late: 0, excused: 0,
            });
          }
          const entry = studentMap.get(rec.student_id)!;
          entry.total += 1;
          if (rec.status === 'present') entry.present += 1;
          else if (rec.status === 'absent') entry.absent += 1;
          else if (rec.status === 'late') entry.late += 1;
          else if (rec.status === 'excused') entry.excused += 1;
        }
      }

      const rows = Array.from(studentMap.values()).map(entry => ({
        'Student Name': entry.student_name,
        'NFC ID': entry.nfc_id,
        'Total Sessions': entry.total,
        'Present': entry.present,
        'Late': entry.late,
        'Absent': entry.absent,
        'Excused': entry.excused,
        'Attendance %': entry.total > 0 ? Math.round(((entry.present + entry.late) / entry.total) * 100) : 0,
      }));

      rows.sort((a, b) => (b['Attendance %'] as number) - (a['Attendance %'] as number));

      const name = `per_student_report_${timePeriod}_${Date.now()}`;
      const pdfColumns = [
        { header: 'Student Name', dataKey: 'Student Name' },
        { header: 'NFC ID', dataKey: 'NFC ID' },
        { header: 'Total', dataKey: 'Total Sessions' },
        { header: 'Present', dataKey: 'Present' },
        { header: 'Late', dataKey: 'Late' },
        { header: 'Absent', dataKey: 'Absent' },
        { header: 'Excused', dataKey: 'Excused' },
        { header: 'Rate', dataKey: 'Attendance %' },
      ];
      exportData(name, exportFormat, rows, `Per-Student Attendance Report (${timePeriod})`, pdfColumns);

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
          <p className="page-sub">Generate attendance and performance reports with daily, weekly, monthly, or custom date ranges</p>
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
              <option value="daily">Today</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="completed">Completed Only</option>
              <option value="all">All Sessions</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">From Date</span>
            <input
              type="date"
              className="field-control"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">To Date</span>
            <input
              type="date"
              className="field-control"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Export Format</span>
            <select
              className="field-control"
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as ExportFormat)}
            >
              <option value="pdf">PDF</option>
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
        <ReportTile
          title="Per-Student Report"
          description="Individual student attendance breakdown across all courses"
          icon="🎓"
          onGenerate={exportPerStudentReport}
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
