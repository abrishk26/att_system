import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { Session, AttendanceRecordWithStudent, Course, Class, Assignment } from '../../api';
import { exportToCSV, exportToPDF } from '../../lib/exportUtils';
import {
  FileText, Download, Filter, Users, BookOpen, BarChart3,
  Calendar, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentAttendanceSummary {
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

type ExportFormat = 'csv' | 'pdf';

export default function ReportsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');

  // Report data
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentAttendanceSummary[]>([]);
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

      const uniqueCourseIds = Array.from(new Set(assignmentsData.map(a => a.course_id)));
      const uniqueClassIds = Array.from(new Set(assignmentsData.map(a => a.class_id)));

      const coursesResults = await Promise.allSettled(uniqueCourseIds.map(id => api.courseDetails(id)));
      const classesResults = await Promise.allSettled(uniqueClassIds.map(id => api.classDetails(id)));

      setCourses(
        coursesResults.filter((r): r is PromiseFulfilledResult<Course> => r.status === 'fulfilled').map(r => r.value)
      );
      setClasses(
        classesResults.filter((r): r is PromiseFulfilledResult<Class> => r.status === 'fulfilled').map(r => r.value)
      );
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const availableClasses = selectedCourse
    ? classes.filter(cls => assignments.some(a => a.course_id === selectedCourse && a.class_id === cls.id))
    : [];

  const generateReport = async () => {
    if (!selectedCourse || !selectedClass) return;
    setGenerating(true);
    setReportGenerated(false);

    try {
      // Fetch sessions with filters
      const filters: { course_id?: string; class_id?: string; date?: string } = {
        course_id: selectedCourse,
        class_id: selectedClass,
      };
      if (dateFrom) filters.date = dateFrom;

      const sessionsData = await api.instructorSessions(filters);

      // Filter by date range on client side for more precision
      let filtered = sessionsData;
      if (dateFrom) {
        filtered = filtered.filter(s => new Date(s.created_at) >= new Date(dateFrom));
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59);
        filtered = filtered.filter(s => new Date(s.created_at) <= endDate);
      }

      // Only finished sessions for reports
      const finishedSessions = filtered.filter(s => s.status === 'finished');
      setSessions(finishedSessions);

      // Fetch all records for these sessions
      const allRecords: AttendanceRecordWithStudent[] = [];
      for (const sess of finishedSessions) {
        try {
          const recs = await api.sessionRecords(sess.id);
          allRecords.push(...recs);
        } catch {
          // Skip failed sessions
        }
      }

      // Build per-student summaries
      const studentMap = new Map<string, StudentAttendanceSummary>();
      for (const rec of allRecords) {
        if (!studentMap.has(rec.student_id)) {
          studentMap.set(rec.student_id, {
            student_id: rec.student_id,
            student_name: rec.student_name,
            nfc_id: rec.nfc_id,
            total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0,
          });
        }
        const entry = studentMap.get(rec.student_id)!;
        entry.total += 1;
        if (rec.status === 'present') entry.present += 1;
        else if (rec.status === 'absent') entry.absent += 1;
        else if (rec.status === 'late') entry.late += 1;
        else if (rec.status === 'excused') entry.excused += 1;
      }

      const summaries = Array.from(studentMap.values()).map(s => ({
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

  const exportReport = () => {
    const courseName = courses.find(c => c.id === selectedCourse)?.name || 'Unknown';
    const cls = classes.find(c => c.id === selectedClass);
    const classLabel = cls ? `Year ${cls.year} Section ${cls.section}` : 'Unknown';
    const filename = `attendance_report_${courseName}_${classLabel}_${new Date().toISOString().slice(0, 10)}`;

    const data = studentSummaries.map(s => ({
      'Student Name': s.student_name,
      'NFC ID': s.nfc_id,
      'Total Sessions': s.total,
      'Present': s.present,
      'Late': s.late,
      'Absent': s.absent,
      'Excused': s.excused,
      'Attendance %': `${s.percentage}%`,
    }));

    if (exportFormat === 'csv') {
      exportToCSV(data, filename);
    } else {
      const columns = [
        { header: 'Student Name', dataKey: 'Student Name' },
        { header: 'NFC ID', dataKey: 'NFC ID' },
        { header: 'Total', dataKey: 'Total Sessions' },
        { header: 'Present', dataKey: 'Present' },
        { header: 'Late', dataKey: 'Late' },
        { header: 'Absent', dataKey: 'Absent' },
        { header: 'Excused', dataKey: 'Excused' },
        { header: 'Rate', dataKey: 'Attendance %' },
      ];
      exportToPDF(`Attendance Report — ${courseName} (${classLabel})`, columns, data, filename);
    }
  };

  const exportSessionDetail = () => {
    const courseName = courses.find(c => c.id === selectedCourse)?.name || 'Unknown';
    const cls = classes.find(c => c.id === selectedClass);
    const classLabel = cls ? `Year ${cls.year} Section ${cls.section}` : 'Unknown';
    const filename = `session_detail_${courseName}_${classLabel}_${new Date().toISOString().slice(0, 10)}`;

    const data = sessions.map(s => ({
      'Session ID': s.id.substring(0, 8),
      'Status': s.status,
      'Date': new Date(s.created_at).toLocaleDateString(),
      'Time': new Date(s.created_at).toLocaleTimeString(),
    }));

    if (exportFormat === 'csv') {
      exportToCSV(data, filename);
    } else {
      const columns = [
        { header: 'Session ID', dataKey: 'Session ID' },
        { header: 'Status', dataKey: 'Status' },
        { header: 'Date', dataKey: 'Date' },
        { header: 'Time', dataKey: 'Time' },
      ];
      exportToPDF(`Session Detail — ${courseName} (${classLabel})`, columns, data, filename);
    }
  };

  // Stats
  const totalStudents = studentSummaries.length;
  const avgAttendance = totalStudents > 0
    ? Math.round(studentSummaries.reduce((sum, s) => sum + s.percentage, 0) / totalStudents)
    : 0;
  const atRisk = studentSummaries.filter(s => s.percentage < 75).length;
  const perfect = studentSummaries.filter(s => s.percentage === 100).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="text-primary" size={32} />
          Attendance Reports
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Generate per-section and per-student attendance reports with export capabilities</p>
      </div>

      {/* Report Configuration */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Filter size={18} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Report Configuration</CardTitle>
              <CardDescription>Select course, class, and date range for your report</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Course */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <BookOpen size={12} className="inline mr-1" /> Course
              </Label>
              <Select value={selectedCourse} onValueChange={(v) => { setSelectedCourse(v); setSelectedClass(''); setReportGenerated(false); }}>
                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Select course..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <Users size={12} className="inline mr-1" /> Class Section
              </Label>
              <Select value={selectedClass} disabled={!selectedCourse} onValueChange={(v) => { setSelectedClass(v); setReportGenerated(false); }}>
                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder={!selectedCourse ? "Select course first" : "Select class..."} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>Year {cls.year} - Section {cls.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <Calendar size={12} className="inline mr-1" /> From Date
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setReportGenerated(false); }}
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <Calendar size={12} className="inline mr-1" /> To Date
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setReportGenerated(false); }}
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Export Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                <SelectTrigger className="h-9 w-28 rounded-lg border-slate-100 bg-slate-50 font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateReport}
              disabled={!selectedCourse || !selectedClass || generating}
              className="h-12 px-8 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {generating ? (
                <><Loader2 size={18} className="animate-spin mr-2" /> Generating...</>
              ) : (
                <><BarChart3 size={18} className="mr-2" /> Generate Report</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportGenerated && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-primary text-white">
              <CardContent className="p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/60">Sessions Analyzed</p>
                <p className="text-3xl font-black mt-1">{sessions.length}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg Attendance</p>
                <p className="text-3xl font-black mt-1 text-slate-900">{avgAttendance}%</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">At Risk</p>
                <p className="text-3xl font-black mt-1 text-rose-500">{atRisk}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Perfect Attendance</p>
                <p className="text-3xl font-black mt-1 text-emerald-500">{perfect}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="students" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-slate-100/50 p-1">
                <TabsTrigger value="students">Per-Student Report</TabsTrigger>
                <TabsTrigger value="sessions">Session Details</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={exportReport} className="rounded-xl font-bold gap-2">
                  <Download size={16} /> Export Students
                </Button>
                <Button variant="outline" onClick={exportSessionDetail} className="rounded-xl font-bold gap-2">
                  <Download size={16} /> Export Sessions
                </Button>
              </div>
            </div>

            <TabsContent value="students">
              <Card className="border-slate-50 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-500 pl-6">Student</TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Total</TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Present</TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Late</TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Absent</TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Excused</TableHead>
                      <TableHead className="font-bold text-slate-500 text-right pr-6">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentSummaries.map((s) => (
                      <TableRow key={s.student_id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                              {s.student_name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm">{s.student_name}</span>
                              <p className="text-[10px] text-slate-400 font-mono">{s.nfc_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-600">{s.total}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-emerald-600 font-bold">{s.present}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-amber-600 font-bold">{s.late}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-rose-600 font-bold">{s.absent}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-blue-600 font-bold">{s.excused}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge
                            variant="outline"
                            className={`font-bold ${
                              s.percentage >= 85 ? 'border-emerald-100 text-emerald-600' :
                              s.percentage >= 75 ? 'border-amber-100 text-amber-600' :
                              'border-rose-100 text-rose-600'
                            }`}
                          >
                            {s.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {studentSummaries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                          No attendance data found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="sessions">
              <Card className="border-slate-50 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-500 pl-6">Session ID</TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Status</TableHead>
                      <TableHead className="font-bold text-slate-500 text-right pr-6">Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 font-mono text-xs text-slate-500">{s.id.substring(0, 8)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-[10px] uppercase">{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-sm text-slate-900">
                              {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-slate-400 font-medium">
                          No completed sessions found for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
