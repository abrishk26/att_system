import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import { BookOpen, History, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function AttendanceHistoryPage() {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { history, isLoading, error } = useAttendance(studentId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Attendance"
        description="Your attendance rate and session breakdown for every enrolled course."
        icon={<History className="h-5 w-5" />}
      />

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium text-foreground">Could not load attendance history</p>
            <p className="mt-1 text-sm text-muted-foreground">Please try again later.</p>
          </CardContent>
        </Card>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <History className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No attendance records yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Records appear here after your instructor starts sessions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-4 py-2 md:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-[200px]">Attendance</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-right">Breakdown</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((course) => {
                  const rate = course.attendancePercentage;
                  const isLow = rate < 75;
                  const isStrong = rate >= 85;

                  return (
                    <TableRow
                      key={course.courseId}
                      className="cursor-pointer"
                      onClick={() => navigate(`/student/course/${course.courseId}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                              isLow
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                                : isStrong
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                  : 'bg-primary/10 text-primary'
                            )}
                          >
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{course.courseCode}</p>
                            <p className="font-medium">{course.courseName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={rate}
                            className={cn('h-2 flex-1', isLow && '[&>div]:bg-rose-500')}
                          />
                          <span
                            className={cn(
                              'w-10 text-right text-sm font-medium tabular-nums',
                              isLow && 'text-rose-600',
                              isStrong && 'text-emerald-600'
                            )}
                          >
                            {rate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                        {course.present + course.late}
                        <span className="text-muted-foreground/60"> / {course.totalSessions}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 text-xs tabular-nums">
                          <span className="text-emerald-600">{course.present}P</span>
                          <span className="text-amber-600">{course.late}L</span>
                          <span className="text-rose-600">{course.absent}A</span>
                          <span className="text-sky-600">{course.excused}E</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
