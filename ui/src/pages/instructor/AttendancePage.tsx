import { useState, useEffect } from 'react';
import {
    Plus,
    ArrowRight,
    History,
    UserCheck,
    CircleCheck,
    Loader2,
} from 'lucide-react';
import { api, type PermissionWithStudent, type Session, type AttendanceRecordWithStudent, type Course, type Class, type Assignment, type EnrichedAssignment } from '../../api';
import { useAuth } from '../../AuthContext';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { PageHeader } from '@/components/instructor/PageHeader';
import { FilterField } from '@/components/instructor/FilterField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewSessionDialog } from '@/components/instructor/attendance/NewSessionDialog';
import { AttendanceRoster } from '@/components/instructor/attendance/AttendanceRoster';
import { Separator } from '@/components/ui/separator';
import { isFinishedSession, sessionStatusLabel } from '@/lib/sessionStatus';

interface ClassDetail extends Class {}

export default function AttendancePage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [records, setRecords] = useState<AttendanceRecordWithStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [completingId, setCompletingId] = useState<string | null>(null);

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<ClassDetail[]>([]);
    const [newSession, setNewSession] = useState({ course_id: '', class_id: '' });
    const [sessionDate, setSessionDate] = useState<Date | undefined>(new Date());
    const [showNewForm, setShowNewForm] = useState(false);
    const [viewingPermission, setViewingPermission] = useState<PermissionWithStudent | null>(null);

    const [filters, setFilters] = useState<{ course_id?: string; class_id?: string; date?: string }>({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const enriched = await api.enrichedAssignments();
            setAssignments(enriched);

            const courseMap = new Map<string, Course>();
            const classMap = new Map<string, ClassDetail>();
            enriched.forEach((a: EnrichedAssignment) => {
                if (!courseMap.has(a.course_id)) {
                    courseMap.set(a.course_id, {
                        id: a.course_id,
                        course_id: a.course_code,
                        name: a.course_name,
                    });
                }
                if (!classMap.has(a.class_id)) {
                    classMap.set(a.class_id, {
                        id: a.class_id,
                        year: a.class_year,
                        section: a.class_section,
                    });
                }
            });
            setCourses(Array.from(courseMap.values()));
            setClasses(Array.from(classMap.values()));

            await fetchSessions();
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const sessionsData = await api.instructorSessions(filters);
            setSessions(
                sessionsData.sort(
                    (a: Session, b: Session) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            );
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        }
    };

    useEffect(() => {
        if (!loading) fetchSessions();
        setCurrentPage(1);
    }, [filters]);

    const handleCreateSession = async () => {
        if (!newSession.course_id || !newSession.class_id) return;

        setActionLoading(true);
        try {
            const session: Session = await api.request('/session/create', {
                method: 'POST',
                body: JSON.stringify({
                    instructor_id: user?.id,
                    ...newSession,
                }),
            });

            await api.request('/record/create', {
                method: 'POST',
                body: JSON.stringify({ session_id: session.id }),
            });

            const mockSession = {
                ...session,
                created_at: sessionDate?.toISOString() || new Date().toISOString(),
            };

            setSessions([mockSession, ...sessions]);
            setShowNewForm(false);
            setNewSession({ course_id: '', class_id: '' });
            await handleSelectSession(mockSession);
        } catch (error) {
            console.error('Failed to create session:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelectSession = async (session: Session) => {
        setSelectedSession(session);
        setRosterLoading(true);
        try {
            const recordsData = await api.sessionRecords(session.id);
            setRecords(recordsData);
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setRosterLoading(false);
        }
    };

    const handleSessionUpdated = (updated: Session) => {
        setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
        );
        setSelectedSession((prev) => (prev?.id === updated.id ? updated : prev));
    };

    const handleCompleteSession = async (
        e: React.MouseEvent,
        session: Session
    ) => {
        e.stopPropagation();
        if (isFinishedSession(session.status)) return;

        setCompletingId(session.id);
        try {
            const updated = await api.updateSession(session.id, 'finished');
            handleSessionUpdated(updated);
        } catch (error) {
            console.error('Failed to complete session:', error);
        } finally {
            setCompletingId(null);
        }
    };

    const handleUpdatePermission = async (id: string, status: 'accepted' | 'rejected') => {
        try {
            await api.updatePermission(id, status);
            if (viewingPermission?.id === id) {
                setViewingPermission((prev) =>
                    prev ? ({ ...prev, status } as PermissionWithStudent) : null
                );
            }
        } catch (error) {
            console.error('Failed to update permission:', error);
        }
    };

    if (loading && !selectedSession) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            </div>
        );
    }

    const selectedCourse = selectedSession
        ? courses.find((c) => c.id === selectedSession.course_id)
        : undefined;
    const selectedClass = selectedSession
        ? classes.find((c) => c.id === selectedSession.class_id)
        : undefined;

    return (
        <div className="animate-fade-in space-y-8">
            {!selectedSession && (
                <PageHeader
                    title="Attendance"
                    description="Filter sessions by course and date, then open a session to mark or review records."
                    icon={<UserCheck className="h-5 w-5" />}
                    actions={
                        <Button onClick={() => setShowNewForm(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New session
                        </Button>
                    }
                />
            )}

            {!selectedSession ? (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Filters</CardTitle>
                            <CardDescription>
                                Narrow the session list by course, section, or date.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-end gap-4">
                            <FilterField label="Course" className="min-w-[200px]">
                                <Select
                                    value={filters.course_id || 'all'}
                                    onValueChange={(v) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            course_id: v === 'all' ? undefined : v,
                                            class_id: undefined,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All courses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All courses</SelectItem>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FilterField>

                            <FilterField label="Class section" className="min-w-[200px]">
                                <Select
                                    value={filters.class_id || 'all'}
                                    disabled={!filters.course_id}
                                    onValueChange={(v) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            class_id: v === 'all' ? undefined : v,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                !filters.course_id
                                                    ? 'Select course first'
                                                    : 'All sections'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All sections</SelectItem>
                                        {classes
                                            .filter((cls) =>
                                                assignments.some(
                                                    (a) =>
                                                        a.course_id === filters.course_id &&
                                                        a.class_id === cls.id
                                                )
                                            )
                                            .map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    Year {cls.year} · Section {cls.section}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </FilterField>

                            <FilterField label="Date" className="min-w-[160px]">
                                <Input
                                    type="date"
                                    value={filters.date || ''}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            date: e.target.value || undefined,
                                        }))
                                    }
                                />
                            </FilterField>

                            <Button variant="outline" onClick={() => setFilters({})}>
                                Clear filters
                            </Button>
                        </CardContent>
                    </Card>

                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{sessions.length}</span>{' '}
                        sessions
                    </p>

                    {sessions.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                    <History className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No sessions yet</h3>
                                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                    Start a new session to track attendance for your class.
                                </p>
                                <Button className="mt-6" onClick={() => setShowNewForm(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New session
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader className="border-b border-border pb-4">
                                <CardTitle className="text-base">Sessions</CardTitle>
                                <CardDescription>
                                    Click a row to open attendance records for that session.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead>Date & time</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions
                                            .slice(
                                                (currentPage - 1) * itemsPerPage,
                                                currentPage * itemsPerPage
                                            )
                                            .map((session) => {
                                                const course = courses.find(
                                                    (c) => c.id === session.course_id
                                                );
                                                const classDetail = classes.find(
                                                    (c) => c.id === session.class_id
                                                );
                                                const isDone = isFinishedSession(session.status);

                                                return (
                                                    <TableRow
                                                        key={session.id}
                                                        onClick={() => handleSelectSession(session)}
                                                        className="cursor-pointer"
                                                    >
                                                        <TableCell>
                                                            <p className="font-medium">
                                                                {course?.name ?? 'Unknown course'}
                                                            </p>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                {session.id.substring(0, 8)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {classDetail
                                                                ? `Year ${classDetail.year} · Sec ${classDetail.section}`
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-sm font-medium">
                                                                {new Date(
                                                                    session.created_at
                                                                ).toLocaleDateString(undefined, {
                                                                    weekday: 'short',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                })}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(
                                                                    session.created_at
                                                                ).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant={isDone ? 'secondary' : 'default'}>
                                                                {sessionStatusLabel(session.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {!isDone ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={completingId === session.id}
                                                                    onClick={(e) =>
                                                                        handleCompleteSession(e, session)
                                                                    }
                                                                >
                                                                    {completingId === session.id ? (
                                                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <CircleCheck className="mr-1.5 h-3.5 w-3.5" />
                                                                    )}
                                                                    Complete
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Closed
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                                {sessions.length > itemsPerPage && (
                                    <div className="flex justify-end border-t border-border p-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCurrentPage((p) => Math.max(1, p - 1));
                                                        }}
                                                        className={
                                                            currentPage === 1
                                                                ? 'pointer-events-none opacity-50'
                                                                : ''
                                                        }
                                                    />
                                                </PaginationItem>
                                                {Array.from({
                                                    length: Math.ceil(sessions.length / itemsPerPage),
                                                }).map((_, i) => (
                                                    <PaginationItem key={i}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={currentPage === i + 1}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setCurrentPage(i + 1);
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
                                                            setCurrentPage((p) =>
                                                                Math.min(
                                                                    Math.ceil(
                                                                        sessions.length / itemsPerPage
                                                                    ),
                                                                    p + 1
                                                                )
                                                            );
                                                        }}
                                                        className={
                                                            currentPage >=
                                                            Math.ceil(sessions.length / itemsPerPage)
                                                                ? 'pointer-events-none opacity-50'
                                                                : ''
                                                        }
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            ) : rosterLoading ? (
                <div className="flex min-h-[400px] items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
                </div>
            ) : (
                <AttendanceRoster
                    session={selectedSession}
                    records={records}
                    course={selectedCourse}
                    classDetail={selectedClass}
                    onBack={() => setSelectedSession(null)}
                    onRecordsChange={setRecords}
                    onSessionUpdated={handleSessionUpdated}
                />
            )}

            <NewSessionDialog
                open={showNewForm}
                onOpenChange={setShowNewForm}
                courses={courses}
                classes={classes}
                assignments={assignments}
                courseId={newSession.course_id}
                classId={newSession.class_id}
                sessionDate={sessionDate}
                loading={actionLoading}
                onCourseChange={(courseId) =>
                    setNewSession({ course_id: courseId, class_id: '' })
                }
                onClassChange={(classId) =>
                    setNewSession((prev) => ({ ...prev, class_id: classId }))
                }
                onDateChange={setSessionDate}
                onSubmit={handleCreateSession}
            />

            <Dialog
                open={!!viewingPermission}
                onOpenChange={(open) => !open && setViewingPermission(null)}
            >
                <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
                    {viewingPermission && (
                        <>
                            <DialogHeader className="border-b border-border bg-muted/30 px-6 py-5">
                                <DialogTitle>Permission request</DialogTitle>
                                <DialogDescription>
                                    From {viewingPermission.student_name}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 px-6 py-5">
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Reason
                                    </p>
                                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                                        {viewingPermission.description}
                                    </div>
                                </div>
                                {viewingPermission.img_url && (
                                    <div>
                                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            Attachment
                                        </p>
                                        <img
                                            src={`${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''}/${viewingPermission.img_url}`}
                                            alt="Permission evidence"
                                            className="max-h-64 w-full rounded-lg border border-border object-cover"
                                        />
                                    </div>
                                )}
                                <Separator />
                                <div className="flex items-center justify-between gap-4">
                                    <Badge variant="outline" className="capitalize">
                                        {viewingPermission.status}
                                    </Badge>
                                    {viewingPermission.status === 'pending' ? (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    handleUpdatePermission(
                                                        viewingPermission.id,
                                                        'rejected'
                                                    )
                                                }
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                onClick={() =>
                                                    handleUpdatePermission(
                                                        viewingPermission.id,
                                                        'accepted'
                                                    )
                                                }
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setViewingPermission(null)}
                                        >
                                            Close
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
