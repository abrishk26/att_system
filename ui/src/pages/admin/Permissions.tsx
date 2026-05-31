import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { PermissionWithStudent, Session, Course } from '../../api';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionDetailDialog } from '@/components/instructor/permissions/PermissionDetailDialog';
import { MetricCard } from '@/components/admin/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, Eye, Loader2, ShieldCheck, XCircle } from 'lucide-react';

interface EnrichedSession extends Session {
  course?: Course;
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected';

export default function Permissions() {
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [permissions, setPermissions] = useState<PermissionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PermissionWithStudent | null>(null);

  useEffect(() => {
    api
      .allSessions()
      .then(async (data) => {
        const enriched = await Promise.all(
          data.map(async (s) => {
            const course = await api.courseDetails(s.course_id).catch(() => undefined);
            return { ...s, course };
          })
        );
        setSessions(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPerms(true);
    (async () => {
      try {
        let res: PermissionWithStudent[];
        if (selectedSession === 'all') {
          res = await api.allPermissions(statusFilter === 'all' ? undefined : statusFilter);
        } else {
          res = await api.permissionsBySession(selectedSession);
          if (statusFilter !== 'all') res = res.filter((p) => p.status === statusFilter);
        }
        if (!cancelled) setPermissions(res);
      } catch {
        if (!cancelled) setPermissions([]);
      } finally {
        if (!cancelled) setLoadingPerms(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSession, statusFilter]);

  const pendingCount = useMemo(
    () => permissions.filter((p) => p.status === 'pending').length,
    [permissions]
  );

  const handleUpdate = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.updatePermission(id, status);
      setPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'accepted')
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Accepted
        </Badge>
      );
    if (status === 'rejected')
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      <PageHeader
        title="Permission inbox"
        description="Review and approve student absence requests across all department sessions."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Showing"
          value={permissions.length}
          sub="Matching current filters"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Pending"
          value={pendingCount}
          sub="Need approve or reject"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <MetricCard
          title="Sessions"
          value={sessions.length}
          sub="With permission data"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sessions (inbox)</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.course?.name ?? 'Course'} · {s.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loadingPerms ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading requests…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6 font-medium">{p.student_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {p.session_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                      {p.description}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {p.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              disabled={updatingId === p.id}
                              onClick={() => handleUpdate(p.id, 'accepted')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === p.id}
                              onClick={() => handleUpdate(p.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {permissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No permission requests match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PermissionDetailDialog
        permission={viewing}
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        updating={!!viewing && updatingId === viewing.id}
        onApprove={(id) => {
          handleUpdate(id, 'accepted');
          setViewing((prev) => (prev?.id === id ? { ...prev, status: 'accepted' } : prev));
        }}
        onReject={(id) => {
          handleUpdate(id, 'rejected');
          setViewing((prev) => (prev?.id === id ? { ...prev, status: 'rejected' } : prev));
        }}
      />
    </div>
  );
}
