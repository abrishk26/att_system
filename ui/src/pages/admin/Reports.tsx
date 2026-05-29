import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { ReportDocument } from '../../api';
import { exportToPDF, exportToExcelFriendlyCsv, openPrintableReportHtml, exportInstitutionalPDF } from '../../lib/exportUtils';
import './Reports.css';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all' | 'completed';
type ExportFormat = 'pdf' | 'excel_csv' | 'html_print' | 'json';

const SERVER_REPORT_TYPES = [
  { id: 'risk', label: 'At-Risk Learner Register', desc: 'Focuses on identifying students below attendance thresholds with high volatility and streaks.' },
  { id: 'student_attendance', label: 'Student Attendance Intelligence', desc: 'Aggregates student records to provide detailed roster profiles and attendance metrics.' },
  { id: 'instructor', label: 'Instructor Performance Overview', desc: 'Analyzes lecture delivery, finished vs. active session completion rates, and average attendance.' },
  { id: 'course', label: 'Course Performance Analysis', desc: 'Identifies course-level engagement, chronological performance declines, and tracking indicators.' },
  { id: 'departmental', label: 'Cohort & Departmental Briefing', desc: 'Segments attendance by class years, sections, and department engagement standards.' },
  { id: 'semester', label: 'Semester Executive Brief', desc: 'High-level synthesis of schoolwide finished sessions, unique student volume, and registry compliance.' },
  { id: 'compliance', label: 'Compliance & NFC Audit Log', desc: 'Audits card tap accuracy, duplicate tap volume, and unidentified card scans.' },
  { id: 'irregularity', label: 'Flagged Irregularities Digest', desc: 'Synthesizes system alerts, critically low lecture turnouts, and potential reader failures.' },
  { id: 'audit', label: 'Attendance Registry Audit Workbook', desc: 'Comprehensive raw verification ledger ideal for academic auditing purposes.' },
  { id: 'comparative', label: 'Comparative Performance Report', desc: 'Compares performance indices across multiple departments and active courses.' },
  { id: 'trend', label: 'Temporal Attendance Trends', desc: 'Chronological timeline trends segmented by days of the week and local hours.' },
];

export default function Reports() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serverReportType, setServerReportType] = useState('risk');
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ name: string; at: string; type: string }[]>([]);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);

  // Load from local storage for recent log history
  useEffect(() => {
    const saved = localStorage.getItem('recent_reports');
    if (saved) {
      try {
        setRecent(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveRecent = (updated: typeof recent) => {
    setRecent(updated);
    localStorage.setItem('recent_reports', JSON.stringify(updated));
  };

  const toIso = (d: string, end: boolean) => {
    if (!d) return undefined;
    const x = new Date(d + (end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
    return x.toISOString();
  };

  // 1. Fetch & Preview Report
  const generatePreview = async () => {
    setError(null);
    setBusy(true);
    setPreviewDoc(null);
    try {
      const doc = await api.buildReport({
        report_type: serverReportType,
        from: dateFrom ? toIso(dateFrom, false) : undefined,
        to: dateTo ? toIso(dateTo, true) : undefined,
        include_charts: false,
      });
      setPreviewDoc(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preview');
    } finally {
      setBusy(false);
    }
  };

  // 2. Export / Print Previewed Report
  const triggerExport = () => {
    if (!previewDoc) return;
    try {
      const name = `${serverReportType}_report_${Date.now()}`;
      
      if (exportFormat === 'pdf') {
        exportInstitutionalPDF(previewDoc, name);
      } else if (exportFormat === 'html_print') {
        openPrintableReportHtml(previewDoc.title, previewDoc);
      } else if (exportFormat === 'excel_csv') {
        const flatRows: Record<string, string>[] = [];
        previewDoc.kpis.forEach(kpi => {
          kpi.items.forEach(item => {
            flatRows.push({ Section: kpi.title, Metric: item[0] ?? '', Value: item[1] ?? '' });
          });
        });
        previewDoc.tables.forEach(table => {
          table.rows.forEach(row => {
            const rowObj: Record<string, string> = { Section: table.title };
            table.columns.forEach((col, idx) => {
              rowObj[col] = row[idx] ?? '';
            });
            flatRows.push(rowObj);
          });
        });
        exportToExcelFriendlyCsv(flatRows, name);
      } else if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(previewDoc, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      const newRecent = [{ name, at: new Date().toISOString(), type: serverReportType }, ...recent].slice(0, 8);
      saveRecent(newRecent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  // 3. Client Side Quick Exports
  const loadBaseSessions = async () => {
    const all = await api.allSessions();
    let filtered = all;
    const now = new Date();
    
    if (timePeriod === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = all.filter(s => new Date(s.created_at) >= start);
    } else if (timePeriod === 'weekly') {
      const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      filtered = all.filter(s => new Date(s.created_at) >= start);
    } else if (timePeriod === 'monthly') {
      const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      filtered = all.filter(s => new Date(s.created_at) >= start);
    } else if (timePeriod === 'completed') {
      filtered = all.filter(s => s.status === 'finished' || s.status === 'completed');
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(s => new Date(s.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.created_at) <= to);
    }
    return filtered;
  };

  const executeQuickExport = async (type: 'dept_summary' | 'course_perf' | 'staff_plan' | 'audit_eval' | 'per_student') => {
    setError(null);
    setBusy(true);
    try {
      const sessions = await loadBaseSessions();
      const filename = `${type}_quick_${Date.now()}`;

      if (type === 'dept_summary') {
        const completed = sessions.filter(s => s.status === 'finished' || s.status === 'completed');
        const records = await Promise.all(
          completed.slice(0, 50).map(s => api.sessionRecords(s.id).catch(() => []))
        );
        const totalRecords = records.flat().length;
        const totalPresent = records.flat().filter(r => r.status === 'present').length;
        const avgRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        const summaryRows = [
          { Metric: 'Total Sessions Found', Value: sessions.length },
          { Metric: 'Completed Sessions (Analyzed)', Value: completed.length },
          { Metric: 'Total Attendance Enrolled Rows', Value: totalRecords },
          { Metric: 'Total Marked Present', Value: totalPresent },
          { Metric: 'Overall Average Attendance', Value: `${avgRate}%` },
        ];
        
        if (exportFormat === 'pdf') {
          exportToPDF('Department Attendance Summary', [
            { header: 'Metric', dataKey: 'Metric' },
            { header: 'Value', dataKey: 'Value' }
          ], summaryRows, filename);
        } else {
          exportToExcelFriendlyCsv(summaryRows, filename);
        }
      }

      else if (type === 'course_perf') {
        const completed = sessions.filter(s => s.status === 'finished' || s.status === 'completed');
        const courseMap = new Map<string, { present: number; total: number; count: number }>();
        const slice = completed.slice(0, 40);
        const records = await Promise.all(
          slice.map(s => api.sessionRecords(s.id).catch(() => []))
        );

        slice.forEach((s, idx) => {
          if (!courseMap.has(s.course_id)) {
            courseMap.set(s.course_id, { present: 0, total: 0, count: 0 });
          }
          const recs = records[idx];
          const entry = courseMap.get(s.course_id)!;
          entry.count += 1;
          entry.total += recs.length;
          entry.present += recs.filter(r => r.status === 'present').length;
        });

        const rows = await Promise.all(
          Array.from(courseMap.entries()).map(async ([courseId, data]) => {
            const course = await api.courseDetails(courseId).catch(() => null);
            return {
              'Course Name': course?.name ?? courseId.slice(0, 10),
              'Course ID': course?.course_id ?? courseId.slice(0, 8),
              'Finished Sessions': data.count,
              'Attendance Rate': data.total > 0 ? `${Math.round((data.present / data.total) * 100)}%` : '0%',
            };
          })
        );

        if (exportFormat === 'pdf') {
          exportToPDF('Course Performance Ledger', [
            { header: 'Course Name', dataKey: 'Course Name' },
            { header: 'Course ID', dataKey: 'Course ID' },
            { header: 'Finished Sessions', dataKey: 'Finished Sessions' },
            { header: 'Attendance Rate', dataKey: 'Attendance Rate' }
          ], rows, filename);
        } else {
          exportToExcelFriendlyCsv(rows, filename);
        }
      }

      else if (type === 'staff_plan') {
        const completed = sessions.filter(s => s.status === 'finished' || s.status === 'completed');
        const staffMap = new Map<string, { present: number; total: number; count: number }>();
        const slice = completed.slice(0, 40);
        const records = await Promise.all(
          slice.map(s => api.sessionRecords(s.id).catch(() => []))
        );

        slice.forEach((s, idx) => {
          if (!staffMap.has(s.instructor_id)) {
            staffMap.set(s.instructor_id, { present: 0, total: 0, count: 0 });
          }
          const recs = records[idx];
          const entry = staffMap.get(s.instructor_id)!;
          entry.count += 1;
          entry.total += recs.length;
          entry.present += recs.filter(r => r.status === 'present').length;
        });

        const intel: any = await api.universityAnalytics().catch(() => null);
        const nameMap = new Map<string, string>();
        if (intel?.instructors) {
          intel.instructors.forEach((i: any) => {
            nameMap.set(i.instructor_id, i.instructor_name ?? i.instructor_id);
          });
        }

        const rows = Array.from(staffMap.entries()).map(([iid, data]) => {
          const name = nameMap.get(iid) ?? iid.slice(0, 8);
          return {
            'Staff Member': name,
            'Staff ID': iid,
            'Total Finished': data.count,
            'Performance Rate': data.total > 0 ? `${Math.round((data.present / data.total) * 100)}%` : '0%',
          };
        });

        if (exportFormat === 'pdf') {
          exportToPDF('Academic Staff Planning Performance', [
            { header: 'Staff Member', dataKey: 'Staff Member' },
            { header: 'Staff ID', dataKey: 'Staff ID' },
            { header: 'Total Finished', dataKey: 'Total Finished' },
            { header: 'Performance Rate', dataKey: 'Performance Rate' }
          ], rows, filename);
        } else {
          exportToExcelFriendlyCsv(rows, filename);
        }
      }

      else if (type === 'audit_eval') {
        const completed = sessions.filter(s => s.status === 'finished' || s.status === 'completed');
        const slice = completed.slice(0, 40);
        const records = await Promise.all(
          slice.map(s => api.sessionRecords(s.id).catch(() => []))
        );

        const rows = slice.map((s, idx) => {
          const recs = records[idx];
          const present = recs.filter(r => r.status === 'present').length;
          const rate = recs.length > 0 ? Math.round((present / recs.length) * 100) : 0;
          return {
            'Session ID': s.id.slice(0, 8),
            'Course ID': s.course_id.slice(0, 8),
            'Class ID': s.class_id.slice(0, 8),
            'Marked Seats': recs.length,
            'Attendance Rate': `${rate}%`,
            'Compliance Status': rate < 70 ? 'CRITICAL' : 'OK',
          };
        });

        if (exportFormat === 'pdf') {
          exportToPDF('Session Registry Compliance Audit', [
            { header: 'Session ID', dataKey: 'Session ID' },
            { header: 'Course ID', dataKey: 'Course ID' },
            { header: 'Class ID', dataKey: 'Class ID' },
            { header: 'Marked Seats', dataKey: 'Marked Seats' },
            { header: 'Attendance Rate', dataKey: 'Attendance Rate' },
            { header: 'Compliance Status', dataKey: 'Compliance Status' }
          ], rows, filename);
        } else {
          exportToExcelFriendlyCsv(rows, filename);
        }
      }

      else if (type === 'per_student') {
        const completed = sessions.filter(s => s.status === 'finished' || s.status === 'completed');
        const slice = completed.slice(0, 30);
        const records = await Promise.all(
          slice.map(s => api.sessionRecords(s.id).catch(() => []))
        );

        const studentMap = new Map<string, { name: string; total: number; present: number; absent: number }>();
        records.flat().forEach(r => {
          if (!studentMap.has(r.student_id)) {
            studentMap.set(r.student_id, { name: r.student_name, total: 0, present: 0, absent: 0 });
          }
          const entry = studentMap.get(r.student_id)!;
          entry.total += 1;
          if (r.status === 'present') entry.present += 1;
          else entry.absent += 1;
        });

        const rows = Array.from(studentMap.entries()).map(([, data]) => ({
          'Student Name': data.name,
          'Total sessions': data.total,
          'Present Count': data.present,
          'Absent Count': data.absent,
          'Attendance Pct': `${Math.round((data.present / data.total) * 100)}%`,
        }));

        if (exportFormat === 'pdf') {
          exportToPDF('Per-Student Roster Overview', [
            { header: 'Student Name', dataKey: 'Student Name' },
            { header: 'Total sessions', dataKey: 'Total sessions' },
            { header: 'Present Count', dataKey: 'Present Count' },
            { header: 'Absent Count', dataKey: 'Absent Count' },
            { header: 'Attendance Pct', dataKey: 'Attendance Pct' }
          ], rows, filename);
        } else {
          exportToExcelFriendlyCsv(rows, filename);
        }
      }

      const newRecent = [{ name: filename, at: new Date().toISOString(), type: 'Quick Export' }, ...recent].slice(0, 8);
      saveRecent(newRecent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quick export failed');
    } finally {
      setBusy(false);
    }
  };

  const activeTemplateDesc = useMemo(() => {
    return SERVER_REPORT_TYPES.find(t => t.id === serverReportType)?.desc ?? '';
  }, [serverReportType]);

  return (
    <div className="reports-page">
      {/* ── Branded Premium Header ── */}
      <div className="reports-brand-header">
        <div className="header-info">
          <h2>Reports &amp; Analytics Hub</h2>
          <p className="page-sub">Access institutional reporting intelligence, export ledger profiles, and audit lecture registries</p>
        </div>
        <div className="header-badge">ADMIN CENTER</div>
      </div>

      {/* ── Primary Settings Strip ── */}
      <div className="card reports-settings-strip">
        <div className="strip-title">⚙ Global Export Constraints</div>
        <div className="strip-form">
          <div className="form-field">
            <span className="label">Date Preset</span>
            <select className="control" value={timePeriod} onChange={e => setTimePeriod(e.target.value as TimePeriod)}>
              <option value="all">All Available History</option>
              <option value="daily">Today Only</option>
              <option value="weekly">Last 7 Calendar Days</option>
              <option value="monthly">Last 30 Calendar Days</option>
              <option value="completed">All Completed Sessions</option>
            </select>
          </div>
          <div className="form-field">
            <span className="label">From Date</span>
            <input type="date" className="control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-field">
            <span className="label">To Date</span>
            <input type="date" className="control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="form-field">
            <span className="label">Export Format</span>
            <select className="control" value={exportFormat} onChange={e => setExportFormat(e.target.value as ExportFormat)}>
              <option value="pdf">Professional PDF (.pdf)</option>
              <option value="excel_csv">Excel-Friendly CSV (.csv)</option>
              <option value="html_print">Print Document View (.html)</option>
              <option value="json">Raw Structured JSON (.json)</option>
            </select>
          </div>
        </div>
        {error && <div className="reports-strip-error">⚠ {error}</div>}
      </div>

      {/* ── Double Column Center Layout ── */}
      <div className="reports-twin-columns">
        
        {/* Left Column: Server Report Engine & Activity log */}
        <div className="column-left flex-col gap-20">
          
          {/* Institutional Engine Card */}
          <div className="card engine-card">
            <div className="engine-header">
              <span className="engine-icon">🏢</span>
              <div>
                <h3 className="section-title">Institutional Report Engine</h3>
                <p className="section-sub">Generate Registrar-enriched reports loaded dynamically from university analytics</p>
              </div>
            </div>
            
            <div className="engine-form">
              <div className="form-field">
                <span className="label">Select Report Template</span>
                <select className="control selection" value={serverReportType} onChange={e => setServerReportType(e.target.value)}>
                  {SERVER_REPORT_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="template-description-card">
                <span className="desc-icon">ℹ</span>
                <p className="desc-text">{activeTemplateDesc}</p>
              </div>
            </div>

            <div className="engine-actions">
              <button className="primary-btn flex-1 justify-center" disabled={busy} onClick={generatePreview}>
                {busy ? <span className="spinner-mini" /> : '🔍'} Load &amp; Preview Report
              </button>
            </div>
          </div>

          {/* Activity Log / Recent Reports Card */}
          <div className="card activity-card">
            <h3 className="section-title">Recent Activity Log</h3>
            <p className="section-sub">Quick access to previously processed exports</p>
            
            <div className="activity-list">
              {recent.length === 0 ? (
                <div className="empty-activity">No recent reports found in session local storage</div>
              ) : (
                recent.map((r, idx) => (
                  <div key={idx} className="activity-row">
                    <div className="activity-icon">📄</div>
                    <div className="activity-meta">
                      <div className="activity-name">{r.name}</div>
                      <div className="activity-tag">{r.type.toUpperCase()}</div>
                    </div>
                    <div className="activity-time">{new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Live Report Roster / Preview Section */}
        <div className="column-right">
          <div className="card preview-card">
            <div className="preview-header">
              <h3 className="section-title">Interactive Live Report Preview</h3>
              {previewDoc ? (
                <button className="export-action-btn animate-bounce" onClick={triggerExport}>
                  📥 Export Document ({exportFormat.toUpperCase()})
                </button>
              ) : (
                <span className="preview-indicator">No report loaded</span>
              )}
            </div>

            <div className="preview-body-frame">
              {previewDoc ? (
                <div className="actual-preview-document">
                  <div className="preview-doc-header">
                    <h4>{previewDoc.title}</h4>
                    <p className="preview-doc-sub">{previewDoc.subtitle}</p>
                    <span className="preview-doc-stamp">Timestamp: {new Date(previewDoc.generated_at).toLocaleString()}</span>
                  </div>

                  <div className="preview-doc-summary-card">
                    <h5>EXECUTIVE BRIEFING</h5>
                    <p>{previewDoc.executive_summary}</p>
                  </div>

                  {previewDoc.kpis.map((kpiBlock, kpiIdx) => (
                    <div key={kpiIdx} className="preview-doc-kpi-section">
                      <h5>{kpiBlock.title}</h5>
                      <div className="preview-kpi-grid">
                        {kpiBlock.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="preview-kpi-tile">
                            <span className="kpi-label">{item[0]}</span>
                            <span className="kpi-value">{item[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {previewDoc.tables.map((table, tIdx) => (
                    <div key={tIdx} className="preview-doc-table-section">
                      <h5>{table.title}</h5>
                      <div className="preview-table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              {table.columns.map((col, colIdx) => <th key={colIdx}>{col}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.slice(0, 8).map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {table.rows.length > 8 && (
                          <div className="table-truncated-caption">... and {table.rows.length - 8} more rows (full document will export complete roster)</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="preview-empty-state">
                  <div className="empty-graphic">📊</div>
                  <h4>No Active Preview Data</h4>
                  <p>Configure and load an institutional template from the report engine panel to view an interactive briefing preview here before exporting.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Premium Quick Client-Side Export Center ── */}
      <div className="reports-section-divider">
        <span>⚡ Quick Export Roster Ledger Center</span>
      </div>

      <div className="quick-export-grids">
        <QuickExportTile
          title="University Enrollment Status"
          desc="Standard executive summary aggregating attendance status distributions and school-wide performance benchmarks."
          icon="👥"
          onTrigger={() => executeQuickExport('dept_summary')}
          disabled={busy}
        />
        <QuickExportTile
          title="Course Roster &amp; Attendance"
          desc="Participation vs. enrollment details sorted across active academic courses. Identifies overall rate averages."
          icon="📚"
          onTrigger={() => executeQuickExport('course_perf')}
          disabled={busy}
        />
        <QuickExportTile
          title="Academic Staff Performance"
          desc="Insights tracking instructors active schedules, finished lecture ratios, and average turnouts."
          icon="🧑‍🏫"
          onTrigger={() => executeQuickExport('staff_plan')}
          disabled={busy}
        />
        <QuickExportTile
          title="Session Registry &amp; Compliance"
          desc="Registry list of active lecture seat capacities and low performance registry warning flags."
          icon="🧾"
          onTrigger={() => executeQuickExport('audit_eval')}
          disabled={busy}
        />
        <QuickExportTile
          title="Per-Student Attendance"
          desc="Detailed individual student logs showing comprehensive attendance statistics across courses."
          icon="🎓"
          onTrigger={() => executeQuickExport('per_student')}
          disabled={busy}
        />
      </div>

      {/* ── Detailed Roster Visualizers ── */}
      <div className="reports-section-divider">
        <span>📈 Advanced Interactive Report Interfaces</span>
      </div>

      <div className="reports-interactive-links">
        <Link to="/admin/reports/student-attendance" className="interactive-report-card">
          <div className="icon-badge bg-emerald">🎓</div>
          <div className="card-info">
            <h4>Student Roster Intelligence Report</h4>
            <p>Advanced granular cohort roster loaded with live Chart.js visualizations, individual trend tracking indices, and risk categorization metrics.</p>
          </div>
          <span className="arrow-icon">→</span>
        </Link>

        <Link to="/admin/reports/course-attendance" className="interactive-report-card">
          <div className="icon-badge bg-indigo">📊</div>
          <div className="card-info">
            <h4>Course Attendance Performance Analyzer</h4>
            <p>Interactive dashboard segregating courses performance by days and hours of active schedules. Complete with risk ratios.</p>
          </div>
          <span className="arrow-icon">→</span>
        </Link>
      </div>
    </div>
  );
}

function QuickExportTile({ title, desc, icon, onTrigger, disabled }: { title: string; desc: string; icon: string; onTrigger: () => void; disabled: boolean }) {
  return (
    <div className="card quick-export-tile">
      <div className="tile-header">
        <span className="tile-icon">{icon}</span>
        <h4>{title}</h4>
      </div>
      <p className="tile-desc">{desc}</p>
      <button className="tile-btn" onClick={onTrigger} disabled={disabled}>
        ⚡ QUICK EXPORT
      </button>
    </div>
  );
}
