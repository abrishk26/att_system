import { useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import type { SessionRecord } from '../../lib/types/student';
import { ArrowLeft, BookOpen, Clock, ListFilter } from 'lucide-react';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { StatusBadge } from '@/components/student/shared/StatusBadge';

const ROWS_PER_PAGE = 8;

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { getCourseDetail } = useAttendance(studentId);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!courseId) {
      navigate('/student/history', { replace: true });
      return;
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const sessionData = await getCourseDetail(courseId);
        setSessions(sessionData);
        setPage(1);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [courseId, getCourseDetail, navigate]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const present = sessions.filter((s) => s.status === 'present').length;
    const late = sessions.filter((s) => s.status === 'late').length;
    const absent = sessions.filter((s) => s.status === 'absent').length;
    const excused = sessions.filter((s) => s.status === 'excused').length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, excused, percentage };
  }, [sessions]);

  const courseName = sessions[0]?.courseName ?? 'Course';

  const totalPages = Math.max(1, Math.ceil(sessions.length / ROWS_PER_PAGE));
  const paginated = sessions.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => navigate('/student/history')}
          aria-label="Back to attendance"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          className="flex-1 border-none pb-0"
          title={courseName}
          description="Session-by-session attendance for this course."
          icon={<BookOpen className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Attendance rate</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.percentage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.percentage} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.present + stats.late} of {stats.total} sessions
            </p>
          </CardContent>
        </Card>
        {(
          [
            { label: 'Present', value: stats.present, color: 'text-emerald-600' },
            { label: 'Late', value: stats.late, color: 'text-amber-600' },
            { label: 'Absent', value: stats.absent, color: 'text-rose-600' },
            { label: 'Excused', value: stats.excused, color: 'text-sky-600' },
          ] as const
        ).map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className={`text-2xl tabular-nums ${color}`}>{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Session log</CardTitle>
              <CardDescription>{stats.total} recorded sessions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-2 md:px-6">
          {sessions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium text-foreground">No sessions recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Attendance will appear here once sessions are held.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((session, index) => {
                    const rowNum = (page - 1) * ROWS_PER_PAGE + index + 1;
                    const date =
                      session.date !== 'TBA'
                        ? new Date(session.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—';

                    return (
                      <TableRow key={session.sessionId}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {rowNum}
                        </TableCell>
                        <TableCell className="font-medium">{date}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {session.startTime}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusBadge status={session.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-end border-t border-border pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                          className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={page === i + 1}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(i + 1);
                            }}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.min(totalPages, p + 1));
                          }}
                          className={
                            page >= totalPages ? 'pointer-events-none opacity-50' : ''
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
