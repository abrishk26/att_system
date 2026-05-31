import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { PermissionWithStudent, Session, Course } from '../../api';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/instructor/PageHeader';
import { FilterField } from '@/components/instructor/FilterField';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PermissionDetailDialog } from '@/components/instructor/permissions/PermissionDetailDialog';
import { cn } from '@/lib/utils';

interface EnrichedSession extends Session {
  course?: Course;
  class_name?: string;
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected';

export default function InstructorPermissionsPage() {
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [permissions, setPermissions] = useState<PermissionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingPermission, setViewingPermission] = useState<PermissionWithStudent | null>(null);

  useEffect(() => {
    Promise.all([api.instructorSessions(), api.enrichedAssignments()])
      .then(([data, enrichedAssigns]) => {
        const courseNameMap = new Map(enrichedAssigns.map((a) => [a.course_id, a.course_name]));
        const classNameMap = new Map(
          enrichedAssigns.map((a) => [
            a.class_id,
            `Year ${a.class_year} · Sec ${a.class_section}`,
          ])
        );
        const enriched = data.map((s) => ({
          ...s,
          course: courseNameMap.has(s.course_id)
            ? ({ id: s.course_id, course_id: '', name: courseNameMap.get(s.course_id)! } as Course)
            : undefined,
          class_name: classNameMap.get(s.class_id),
        }));
        setSessions(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPerms(true);

    const fetchPromise = selectedSession
      ? api.permissionsBySession(selectedSession)
      : api.allPermissions(statusFilter === 'all' ? undefined : statusFilter);

    fetchPromise
      .then((res) => {
        if (!cancelled) setPermissions(res);
      })
      .catch(() => {
        if (!cancelled) setPermissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPerms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSession, statusFilter]);

  const sessionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      const date = new Date(s.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      map.set(
        s.id,
        `${s.course?.name ?? 'Session'} · ${s.class_name ?? 'Section'} · ${date}`
      );
    });
    return map;
  }, [sessions]);

  const displayedPermissions = useMemo(() => {
    if (statusFilter === 'all') return permissions;
    return permissions.filter((p) => p.status === statusFilter);
  }, [permissions, statusFilter]);

  const counts = useMemo(
    () => ({
      pending: permissions.filter((p) => p.status === 'pending').length,
      accepted: permissions.filter((p) => p.status === 'accepted').length,
      rejected: permissions.filter((p) => p.status === 'rejected').length,
      total: permissions.length,
    }),
    [permissions]
  );

  const pendingList = displayedPermissions.filter((p) => p.status === 'pending');
  const resolvedList = displayedPermissions.filter((p) => p.status !== 'pending');

  const handleUpdate = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.updatePermission(id, status);
      setPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      if (viewingPermission?.id === id) {
        setViewingPermission((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Permissions"
        description="Review and approve student absence requests tied to your sessions."
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard label="Pending" value={counts.pending} accent="text-amber-600" />
        <SummaryCard label="Approved" value={counts.accepted} accent="text-emerald-600" />
        <SummaryCard label="Rejected" value={counts.rejected} accent="text-rose-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Narrow requests by session or status.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <FilterField label="Session" className="min-w-[240px] flex-1">
            <Select
              value={selectedSession || 'all'}
              onValueChange={(v) => setSelectedSession(v === 'all' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {sessionLabelMap.get(s.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Status" className="min-w-[160px]">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          {(selectedSession || statusFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSession('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {loadingPerms ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <PermissionsTable
            title="Pending requests"
            description="Requires your approval or rejection."
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            rows={pendingList}
            sessionLabelMap={sessionLabelMap}
            updatingId={updatingId}
            onView={setViewingPermission}
            onApprove={(id) => handleUpdate(id, 'accepted')}
            onReject={(id) => handleUpdate(id, 'rejected')}
            showActions
          />

          <PermissionsTable
            title="Resolved requests"
            description="Previously approved or rejected."
            icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
            rows={resolvedList}
            sessionLabelMap={sessionLabelMap}
            updatingId={updatingId}
            onView={setViewingPermission}
            showActions={false}
          />

          {displayedPermissions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No permission requests</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedSession
                    ? 'No requests for this session.'
                    : 'Nothing matches your filters.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <PermissionDetailDialog
        permission={viewingPermission}
        open={Boolean(viewingPermission)}
        onOpenChange={(open) => !open && setViewingPermission(null)}
        sessionLabel={
          viewingPermission ? sessionLabelMap.get(viewingPermission.session_id) : undefined
        }
        updating={viewingPermission ? updatingId === viewingPermission.id : false}
        onApprove={(id) => handleUpdate(id, 'accepted')}
        onReject={(id) => handleUpdate(id, 'rejected')}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function PermissionsTable({
  title,
  description,
  icon,
  rows,
  sessionLabelMap,
  updatingId,
  onView,
  onApprove,
  onReject,
  showActions,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  rows: PermissionWithStudent[];
  sessionLabelMap: Map<string, string>;
  updatingId: string | null;
  onView: (p: PermissionWithStudent) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 md:px-6">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.student_name}</TableCell>
                <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                  {sessionLabelMap.get(p.session_id) ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                  <span className="line-clamp-2 break-words">{p.description}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => onView(p)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                    {showActions && onApprove && onReject && p.status === 'pending' && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingId === p.id}
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => onReject(p.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={updatingId === p.id}
                          onClick={() => onApprove(p.id)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'pending'
      ? 'outline'
      : status === 'accepted'
        ? 'default'
        : status === 'rejected'
          ? 'destructive'
          : 'secondary';
  return (
    <Badge variant={variant} className="capitalize">
      {status === 'accepted' ? 'approved' : status}
    </Badge>
  );
}
