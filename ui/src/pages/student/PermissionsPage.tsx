import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, type Course, type Session, type AttendanceRecord, type Permission } from '../../api';
import {
  ShieldAlert,
  Plus,
  CheckCircle2,
  Loader2,
  FileUp,
} from 'lucide-react';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/student/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PermissionsPage() {
  const { studentId: _studentId } = useOutletContext<{ studentId: string }>();

  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [courseList, sessionList, recordList, permissionList] = await Promise.all([
          api.studentCourses(),
          api.studentSessionsFull(),
          api.studentSessions(),
          api.studentPermissions(),
        ]);
        setCourses(courseList);
        setSessions(sessionList);
        setMyRecords(recordList);
        setPermissions(permissionList);
      } catch (err) {
        console.error('Failed to load permission data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const sessionById = useMemo(
    () => new Map(sessions.map((s) => [s.id, s])),
    [sessions]
  );

  const courseById = useMemo(
    () => new Map(courses.map((c) => [c.id, c])),
    [courses]
  );

  const filteredSessions = useMemo(() => {
    if (!selectedCourse) return [];
    const studentSessionIds = new Set(myRecords.map((r) => r.session_id));
    return sessions
      .filter((s) => s.course_id === selectedCourse && studentSessionIds.has(s.id))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [selectedCourse, sessions, myRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !reason.trim()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('session_id', selectedSession);
      formData.append('description', reason.trim());
      if (file) formData.append('file', file);

      await api.createPermission(formData);
      const updated = await api.studentPermissions();
      setPermissions(updated);

      setSelectedCourse('');
      setSelectedSession('');
      setReason('');
      setFile(null);
      setShowModal(false);
      setSuccessMessage('Your request was submitted successfully.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sessionLabel = (sessionId: string) => {
    const session = sessionById.get(sessionId);
    const course = session ? courseById.get(session.course_id) : undefined;
    const date = session
      ? new Date(session.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Unknown date';
    return `${course?.name ?? 'Course'} · ${date}`;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Permission requests"
        description="Submit and track absence justifications for class sessions."
        icon={<ShieldAlert className="h-5 w-5" />}
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New request
          </Button>
        }
      />

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Your requests</CardTitle>
          <CardDescription>
            {permissions.length} request{permissions.length !== 1 ? 's' : ''} on file
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-2 md:px-6">
          {permissions.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit a request when you need to justify an absence.
              </p>
              <Button className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New request
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course & session</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{sessionLabel(req.session_id)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <span className="line-clamp-2 break-words text-sm text-muted-foreground">
                        {req.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge
                        status={
                          req.status === 'accepted'
                            ? 'accepted'
                            : req.status === 'rejected'
                              ? 'rejected'
                              : 'pending'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border bg-muted/30 px-6 py-5">
            <DialogTitle>New permission request</DialogTitle>
            <DialogDescription>
              Explain your absence for a specific class session. Attach supporting evidence if you have it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="perm-course">Course</Label>
              <Select
                value={selectedCourse || undefined}
                onValueChange={(v) => {
                  setSelectedCourse(v);
                  setSelectedSession('');
                }}
              >
                <SelectTrigger id="perm-course">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.course_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perm-session">Session</Label>
              <Select
                value={selectedSession || undefined}
                disabled={!selectedCourse || filteredSessions.length === 0}
                onValueChange={setSelectedSession}
              >
                <SelectTrigger id="perm-session">
                  <SelectValue
                    placeholder={
                      !selectedCourse
                        ? 'Select a course first'
                        : filteredSessions.length === 0
                          ? 'No sessions available'
                          : 'Select a session'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {new Date(s.created_at).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perm-reason">Reason</Label>
              <textarea
                id="perm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why you were absent or late…"
                className="flex min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment (optional)</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">
                    {file ? file.name : 'Upload PDF, JPG, or PNG'}
                  </p>
                  <p className="text-xs text-muted-foreground">Max one file</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-0 pb-0 pt-4 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedSession || !reason.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
