import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api';
import { PageHeader } from '@/components/admin/PageHeader';
import { DateRangeBar } from '@/components/admin/DateRangeBar';
import { useUniversityIntel } from '@/hooks/admin/useUniversityIntel';
import { toIsoEnd, toIsoStart } from '@/lib/admin/dates';
import { pct } from '@/lib/admin/metrics';
import {
  AttendanceTimelineChart,
  CohortChart,
  DayOfWeekChart,
  HourlyChart,
  SessionHeatmap,
  StatusStackedChart,
} from '@/components/admin/intelligence/charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { exportToExcelFriendlyCsv } from '@/lib/exportUtils';
import { BatchAnalyticsPanel } from '@/components/admin/analytics/BatchAnalyticsPanel';

function SectionIntro({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { intel, loading, error, reload } = useUniversityIntel(from, to, 0);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<Record<string, unknown> | null>(null);
  const [courseSort, setCourseSort] = useState<'rate' | 'sessions' | 'decline'>('rate');

  useEffect(() => {
    if (!studentId) {
      setStudentDetail(null);
      return;
    }
    api
      .adminStudentAnalytics(studentId, {
        from: from ? toIsoStart(from) : undefined,
        to: to ? toIsoEnd(to) : undefined,
      })
      .then(setStudentDetail)
      .catch(() => setStudentDetail(null));
  }, [studentId, from, to]);

  const sortedCourses = useMemo(() => {
    if (!intel) return [];
    const list = [...intel.courses];
    if (courseSort === 'rate') list.sort((a, b) => a.attendance_rate - b.attendance_rate);
    else if (courseSort === 'sessions') list.sort((a, b) => b.sessions_finished - a.sessions_finished);
    else list.sort((a, b) => b.decline_score - a.decline_score);
    return list;
  }, [intel, courseSort]);

  const exportAtRisk = () => {
    if (!intel) return;
    exportToExcelFriendlyCsv(
      intel.students_at_risk.map((s) => ({
        Student: s.student_name ?? s.student_id,
        Sessions: s.sessions_count,
        'Attendance %': s.attendance_rate,
        'Absence streak (max)': s.max_absence_streak,
        'Risk score': s.risk_score,
        Flagged: s.predicted_low ? 'yes' : 'no',
      })),
      `at_risk_${Date.now()}`
    );
  };

  if (loading && !intel) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !intel) {
    return (
      <div className="py-16 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  if (!intel) return null;

  const k = intel.kpi;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <PageHeader
        title="Analytics"
        description="Historical analysis for the selected period. Use the dashboard for live operations; this page answers “how are we doing over time?”"
      />

      <DateRangeBar
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={reload}
        generatedAt={intel.meta.generated_at}
      />

      <SectionIntro
        title="Reading these numbers"
        body="All metrics below are computed from attendance marks recorded when instructors close sessions. Attendance rate = (present + late) ÷ total marks. Punctuality = present ÷ (present + late). Decline score measures whether attendance drops in later sessions for the same course."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Attendance rate"
          value={pct(k.overall_attendance_rate)}
          help="Students marked present or late, as a percentage of all marks in range."
        />
        <SummaryTile
          label="Punctuality"
          value={pct(k.punctuality_index)}
          help="Among engaged students (present or late), how often they were on time (present only)."
        />
        <SummaryTile
          label="Finished sessions"
          value={String(k.finished_sessions)}
          help={`${k.active_sessions} still open · ${k.incoming_sessions} scheduled in range.`}
        />
        <SummaryTile
          label="Students in data"
          value={String(k.unique_students)}
          help={`${k.unique_instructors} instructors · ${k.unique_course_offerings} course sections with marks.`}
        />
      </div>

      <Tabs defaultValue="batches" className="space-y-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="batches">Batches & sections</TabsTrigger>
          <TabsTrigger value="quality">Mark quality</TabsTrigger>
          <TabsTrigger value="patterns">Time patterns</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="instructors">Instructors</TabsTrigger>
          <TabsTrigger value="students">At-risk students</TabsTrigger>
          <TabsTrigger value="hardware">NFC & alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <BatchAnalyticsPanel intel={intel} />
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <StatusStackedChart intel={intel} />
          <AttendanceTimelineChart intel={intel} />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Absent</CardDescription>
                <CardTitle>{pct(k.absent_rate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Marks recorded as absent (did not attend).
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Late</CardDescription>
                <CardTitle>{pct(k.late_rate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Arrived but marked late by the instructor or NFC rules.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Excused</CardDescription>
                <CardTitle>{pct(k.excused_rate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Approved absences (permissions accepted).
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <SectionIntro
            title="When attendance is strongest"
            body="Compare weekdays and lecture hours to adjust timetabling or target outreach before exams."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <DayOfWeekChart intel={intel} />
            <HourlyChart intel={intel} />
          </div>
          <CohortChart intel={intel} />
          <SessionHeatmap intel={intel} />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {sortedCourses.length} courses with finished sessions in range.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={courseSort === 'rate' ? 'default' : 'outline'}
                onClick={() => setCourseSort('rate')}
              >
                Lowest attendance
              </Button>
              <Button
                size="sm"
                variant={courseSort === 'decline' ? 'default' : 'outline'}
                onClick={() => setCourseSort('decline')}
              >
                Highest decline
              </Button>
              <Button
                size="sm"
                variant={courseSort === 'sessions' ? 'default' : 'outline'}
                onClick={() => setCourseSort('sessions')}
              >
                Most sessions
              </Button>
            </div>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Course</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right pr-6">Decline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCourses.map((c) => (
                  <TableRow key={c.course_id}>
                    <TableCell className="pl-6 font-medium">
                      {c.course_name ?? c.course_code ?? c.course_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.sessions_finished}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.records}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(c.attendance_rate)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge variant={c.decline_score > 0.15 ? 'destructive' : 'secondary'}>
                        {(c.decline_score * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weakest sections</CardTitle>
              <CardDescription>Lowest attendance by course + class section</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Section</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right pr-6">Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...intel.sections]
                    .sort((a, b) => a.attendance_rate - b.attendance_rate)
                    .slice(0, 15)
                    .map((s) => (
                      <TableRow key={`${s.course_id}-${s.class_id}`}>
                        <TableCell className="pl-6">
                          {s.course_name ?? s.course_id.slice(0, 8)}
                          {s.class_label ? ` · ${s.class_label}` : ''}
                        </TableCell>
                        <TableCell className="text-right">{s.sessions_finished}</TableCell>
                        <TableCell className="pr-6 text-right">{pct(s.attendance_rate)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructors">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Instructor comparison</CardTitle>
              <CardDescription>
                Completion % is finished sessions ÷ total sessions assigned to the instructor in
                range.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Instructor</TableHead>
                    <TableHead className="text-right">Finished / total</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    <TableHead className="text-right">Punctuality</TableHead>
                    <TableHead className="text-right pr-6">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...intel.instructors]
                    .sort((a, b) => b.sessions_finished - a.sessions_finished)
                    .map((i) => (
                      <TableRow key={i.instructor_id}>
                        <TableCell className="pl-6 font-medium">
                          {i.instructor_name ?? i.instructor_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {i.sessions_finished}/{i.sessions_total}
                        </TableCell>
                        <TableCell className="text-right">{pct(i.attendance_rate)}</TableCell>
                        <TableCell className="text-right">{pct(i.punctuality_index)}</TableCell>
                        <TableCell className="pr-6 text-right">{pct(i.completion_proxy)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <SectionIntro
            title="Who appears here"
            body="Students with enough session marks to score risk: low attendance, long absence streaks, or unstable week-to-week attendance. “Flagged” means the model predicts they will fall below department thresholds."
          />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportAtRisk}>
              Download CSV
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Max absence streak</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                  <TableHead className="pr-6 text-right">Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...intel.students_at_risk]
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .map((s) => (
                    <TableRow
                      key={s.student_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setStudentId(s.student_id)}
                    >
                      <TableCell className="pl-6 font-medium">
                        {s.student_name ?? s.student_id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right">{s.sessions_count}</TableCell>
                      <TableCell className="text-right">{pct(s.attendance_rate)}</TableCell>
                      <TableCell className="text-right">{s.max_absence_streak}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.risk_score.toFixed(1)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {s.predicted_low ? (
                          <Badge variant="destructive">Flagged</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="hardware" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="NFC taps"
              value={String(intel.tap_audit.total_taps)}
              help="Card scans recorded in range."
            />
            <SummaryTile
              label="Tap success"
              value={pct(intel.tap_audit.success_rate)}
              help="Successful reads vs failed or rejected taps."
            />
            <SummaryTile
              label="Duplicate taps"
              value={String(intel.tap_audit.duplicate_taps)}
              help="Same card tapped twice in one session window."
            />
            <SummaryTile
              label="Unknown cards"
              value={String(intel.tap_audit.unknown_card_taps)}
              help="Taps from NFC IDs not linked to a student."
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System alerts</CardTitle>
              <CardDescription>
                Unusual sessions — very low turnout, missing marks, or reader issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {intel.anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anomalies in this period.</p>
              ) : (
                intel.anomalies.map((a, i) => (
                  <div key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>
                        {a.severity}
                      </Badge>
                      <span className="text-xs uppercase text-muted-foreground">{a.kind}</span>
                    </div>
                    <p className="mt-1">{a.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!studentId} onOpenChange={(o) => !o && setStudentId(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student detail</DialogTitle>
          </DialogHeader>
          {studentDetail ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(studentDetail).map(([key, val]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-border py-1">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-medium text-right">{String(val)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
