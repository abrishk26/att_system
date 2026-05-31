import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import type { Session, AttendanceRecordWithStudent, Course, Class, Assignment } from '../../api';
import { exportToCSV, exportInstitutionalPDF, type ReportDocument } from '../../lib/exportUtils';
import { PageHeader } from '@/components/instructor/PageHeader';
import { FilterField } from '@/components/instructor/FilterField';
import { ReportCharts } from '@/components/instructor/reports/ReportCharts';
import { FileText, Download, BarChart3, Loader2, Table2, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  nfc_id: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface SessionStat {
  id: string;
  created_at: string;
  status: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
}

function isCompletedSession(status: string) {
  return status === 'finished' || status === 'completed';
}

export default function ReportsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStat[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentAttendanceSummary[]>([]);
  const [statusCounts, setStatusCounts] = useState({ present: 0, late: 0, absent: 0, excused: 0 });

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const assignmentsData = await api.instructorAssignments();
      setAssignments(assignmentsData);
      const uniqueCourseIds = Array.from(new Set(assignmentsData.map((a) => a.course_id)));
      const uniqueClassIds = Array.from(new Set(assignmentsData.map((a) => a.class_id)));
      const coursesResults = await Promise.allSettled(uniqueCourseIds.map((id) => api.courseDetails(id)));
      const classesResults = await Promise.allSettled(uniqueClassIds.map((id) => api.classDetails(id)));
      setCourses(
        coursesResults
          .filter((r): r is PromiseFulfilledResult<Course> => r.status === 'fulfilled')
          .map((r) => r.value)
      );
      setClasses(
        classesResults
          .filter((r): r is PromiseFulfilledResult<Class> => r.status === 'fulfilled')
          .map((r) => r.value)
      );
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const availableClasses = selectedCourse
    ? classes.filter((cls) => assignments.some((a) => a.course_id === selectedCourse && a.class_id === cls.id))
    : [];

  const courseName = courses.find((c) => c.id === selectedCourse)?.name || 'Course';
  const cls = classes.find((c) => c.id === selectedClass);
  const classLabel = cls ? `Year ${cls.year} · Section ${cls.section}` : 'Section';
  const exportPrefix = `report_${courseName.replace(/\s+/g, '_')}`;

  const generateReport = async () => {
    if (!selectedCourse || !selectedClass) return;
    setGenerating(true);
    setReportGenerated(false);

    try {
      const filters: { course_id?: string; class_id?: string; date?: string } = {
        course_id: selectedCourse,
        class_id: selectedClass,
      };
      if (dateFrom) filters.date = dateFrom;

      let filtered = await api.instructorSessions(filters);
      if (dateFrom) {
        filtered = filtered.filter((s) => new Date(s.created_at) >= new Date(dateFrom));
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        filtered = filtered.filter((s) => new Date(s.created_at) <= end);
      }

      const finishedSessions = filtered.filter((s) => isCompletedSession(s.status));
      setSessions(finishedSessions);

      const allRecords: AttendanceRecordWithStudent[] = [];
      const stats: SessionStat[] = [];

      for (const sess of finishedSessions) {
        try {
          const recs = await api.sessionRecords(sess.id);
          allRecords.push(...recs);
          let present = 0,
            absent = 0,
            late = 0,
            excused = 0;
          for (const r of recs) {
            if (r.status === 'present') present++;
            else if (r.status === 'absent') absent++;
            else if (r.status === 'late') late++;
            else if (r.status === 'excused') excused++;
          }
          const total = recs.length;
          stats.push({
            id: sess.id,
            created_at: sess.created_at,
            status: sess.status,
            present,
            absent,
            late,
            excused,
            total,
            rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
          });
        } catch {
          /* skip */
        }
      }
      setSessionStats(stats);

      const totals = { present: 0, late: 0, absent: 0, excused: 0 };
      const studentMap = new Map<string, StudentAttendanceSummary>();

      for (const rec of allRecords) {
        totals.present += rec.status === 'present' ? 1 : 0;
        totals.late += rec.status === 'late' ? 1 : 0;
        totals.absent += rec.status === 'absent' ? 1 : 0;
        totals.excused += rec.status === 'excused' ? 1 : 0;

        if (!studentMap.has(rec.student_id)) {
          studentMap.set(rec.student_id, {
            student_id: rec.student_id,
            student_name: rec.student_name,
            nfc_id: rec.nfc_id,
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            percentage: 0,
          });
        }
        const entry = studentMap.get(rec.student_id)!;
        entry.total += 1;
        if (rec.status === 'present') entry.present += 1;
        else if (rec.status === 'absent') entry.absent += 1;
        else if (rec.status === 'late') entry.late += 1;
        else if (rec.status === 'excused') entry.excused += 1;
      }

      setStatusCounts(totals);

      const summaries = Array.from(studentMap.values()).map((s) => ({
        ...s,
        percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
      }));
      summaries.sort((a, b) => b.percentage - a.percentage);
      setStudentSummaries(summaries);
      setReportGenerated(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGenerating(false);
    }
  };

  const totalStudents = studentSummaries.length;
  const avgAttendance =
    totalStudents > 0
      ? Math.round(studentSummaries.reduce((sum, s) => sum + s.percentage, 0) / totalStudents)
      : 0;
  const atRisk = studentSummaries.filter((s) => s.percentage < 75).length;
  const perfect = studentSummaries.filter((s) => s.percentage === 100).length;

  const bandCounts = useMemo(
    () => ({
      excellent: studentSummaries.filter((s) => s.percentage >= 85).length,
      satisfactory: studentSummaries.filter((s) => s.percentage >= 75 && s.percentage < 85).length,
      atRisk: studentSummaries.filter((s) => s.percentage < 75).length,
    }),
    [studentSummaries]
  );

  const chartStudents = useMemo(() => {
    const top = [...studentSummaries].sort((a, b) => b.percentage - a.percentage).slice(0, 12);
    return {
      labels: top.map((s) => s.student_name.split(' ')[0] || s.student_name),
      rates: top.map((s) => s.percentage),
    };
  }, [studentSummaries]);

  const chartSessions = useMemo(() => {
    const sorted = [...sessionStats].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return {
      labels: sorted.map((s) =>
        new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      rates: sorted.map((s) => s.rate),
    };
  }, [sessionStats]);

  const exportStudentsCsv = () => {
    exportToCSV(
      studentSummaries.map((s) => ({
        Student: s.student_name,
        'NFC ID': s.nfc_id,
        'Total marks': s.total,
        Present: s.present,
        Late: s.late,
        Absent: s.absent,
        Excused: s.excused,
        'Attendance %': s.percentage,
      })),
      `${exportPrefix}_students`
    );
  };

  const exportSessionsCsv = () => {
    exportToCSV(
      sessionStats.map((s) => ({
        'Session ID': s.id.substring(0, 8),
        Date: new Date(s.created_at).toLocaleString(),
        Status: s.status,
        Present: s.present,
        Late: s.late,
        Absent: s.absent,
        Excused: s.excused,
        Total: s.total,
        'Attendance %': s.rate,
      })),
      `${exportPrefix}_sessions`
    );
  };

  const exportFullPdf = () => {
    const dateRange =
      dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom ? `from ${dateFrom}` : dateTo ? `until ${dateTo}` : 'all dates';

    const doc: ReportDocument = {
      title: 'Section Attendance Analytics Report',
      subtitle: `${courseName} — ${classLabel} · ${dateRange}`,
      generated_at: new Date().toISOString(),
      executive_summary: `Analysis of ${sessions.length} completed session(s) for ${totalStudents} students. Average attendance is ${avgAttendance}%. Status breakdown: ${statusCounts.present} present, ${statusCounts.late} late, ${statusCounts.absent} absent, ${statusCounts.excused} excused. ${atRisk} student(s) are below 75% and ${perfect} have perfect attendance. Export chart images separately as PNG from the Charts tab.`,
      kpis: [
        {
          title: 'Key metrics',
          items: [
            ['Sessions', String(sessions.length)],
            ['Students', String(totalStudents)],
            ['Avg attendance', `${avgAttendance}%`],
            ['At risk', String(atRisk)],
            ['Perfect', String(perfect)],
          ],
        },
        {
          title: 'Performance bands',
          items: [
            ['Excellent (≥85%)', String(bandCounts.excellent)],
            ['Satisfactory (75–84%)', String(bandCounts.satisfactory)],
            ['At risk (<75%)', String(bandCounts.atRisk)],
          ],
        },
      ],
      tables: [
        {
          title: 'Student attendance summary',
          columns: ['Student', 'NFC', 'Total', 'Present', 'Late', 'Absent', 'Excused', 'Rate'],
          rows: studentSummaries.map((s) => [
            s.student_name,
            s.nfc_id,
            String(s.total),
            String(s.present),
            String(s.late),
            String(s.absent),
            String(s.excused),
            `${s.percentage}%`,
          ]),
        },
        {
          title: 'Session breakdown',
          columns: ['Session', 'Date', 'Present', 'Late', 'Absent', 'Excused', 'Rate'],
          rows: sessionStats.map((s) => [
            s.id.substring(0, 8),
            new Date(s.created_at).toLocaleDateString(),
            String(s.present),
            String(s.late),
            String(s.absent),
            String(s.excused),
            `${s.rate}%`,
          ]),
        },
      ],
    };
    exportInstitutionalPDF(doc, exportPrefix);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Reports & analytics"
        description="Generate charts and tables from real attendance data. Export tables as CSV/PDF and each chart as PNG."
        icon={<FileText className="h-5 w-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameters</CardTitle>
          <CardDescription>Select course, section, and date range, then generate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <FilterField label="Course">
              <Select
                value={selectedCourse}
                onValueChange={(v) => {
                  setSelectedCourse(v);
                  setSelectedClass('');
                  setReportGenerated(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Section">
              <Select
                value={selectedClass}
                disabled={!selectedCourse}
                onValueChange={(v) => {
                  setSelectedClass(v);
                  setReportGenerated(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedCourse ? 'Select course first' : 'Select section'} />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Year {c.year} · Section {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="From">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setReportGenerated(false); }} />
            </FilterField>
            <FilterField label="To">
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setReportGenerated(false); }} />
            </FilterField>
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={generateReport} disabled={!selectedCourse || !selectedClass || generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" /> Generate report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportGenerated && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="text-2xl font-semibold">{sessions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Avg attendance</p>
                <p className="text-2xl font-semibold">{avgAttendance}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">At risk (&lt;75%)</p>
                <p className="text-2xl font-semibold text-amber-600">{atRisk}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Perfect attendance</p>
                <p className="text-2xl font-semibold text-emerald-600">{perfect}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{courseName}</span> · {classLabel} — {totalStudents}{' '}
                students, {sessions.length} sessions analyzed.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportStudentsCsv}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Students CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportSessionsCsv}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Sessions CSV
                </Button>
                <Button size="sm" onClick={exportFullPdf}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Full PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="charts" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="charts" className="gap-1.5">
                <LineChart className="h-3.5 w-3.5" /> Charts
              </TabsTrigger>
              <TabsTrigger value="students" className="gap-1.5">
                <Table2 className="h-3.5 w-3.5" /> Students
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-1.5">
                <Table2 className="h-3.5 w-3.5" /> Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Use the PNG button on each chart to export graphs for slides or printing.
              </p>
              <ReportCharts
                studentLabels={chartStudents.labels}
                studentRates={chartStudents.rates}
                sessionLabels={chartSessions.labels}
                sessionRates={chartSessions.rates}
                statusCounts={statusCounts}
                bandCounts={bandCounts}
                exportPrefix={exportPrefix}
              />
            </TabsContent>

            <TabsContent value="students" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Student attendance table</CardTitle>
                    <CardDescription>Per-student totals across all analyzed sessions.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportStudentsCsv}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Excused</TableHead>
                        <TableHead className="w-[140px]">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentSummaries.map((s) => (
                        <TableRow key={s.student_id}>
                          <TableCell>
                            <p className="font-medium">{s.student_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{s.nfc_id}</p>
                          </TableCell>
                          <TableCell className="text-center text-emerald-600">{s.present}</TableCell>
                          <TableCell className="text-center text-amber-600">{s.late}</TableCell>
                          <TableCell className="text-center text-red-600">{s.absent}</TableCell>
                          <TableCell className="text-center text-blue-600">{s.excused}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={s.percentage} className="h-2 flex-1" />
                              <span className="w-10 text-right text-sm font-medium">{s.percentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Session breakdown table</CardTitle>
                    <CardDescription>Attendance counts and rate for each completed session.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportSessionsCsv}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Excused</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionStats.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <p className="font-medium">
                              {new Date(s.created_at).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">{s.present}</TableCell>
                          <TableCell className="text-center">{s.late}</TableCell>
                          <TableCell className="text-center">{s.absent}</TableCell>
                          <TableCell className="text-center">{s.excused}</TableCell>
                          <TableCell className="text-center">{s.total}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                s.rate >= 85
                                  ? 'border-emerald-200 text-emerald-700'
                                  : s.rate >= 75
                                    ? 'border-amber-200 text-amber-700'
                                    : 'border-red-200 text-red-700'
                              }
                            >
                              {s.rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
