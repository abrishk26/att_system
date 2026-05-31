import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import type { Session, Course, Class } from '../../api';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface EnrichedSession extends Session {
  course?: Course;
  class?: Class;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sessionsData, intel] = await Promise.all([
          api.allSessions(),
          api.universityAnalytics().catch(() => null),
        ]);
        const courseMap = new Map<string, string>();
        const sectionMap = new Map<string, string>();
        intel?.courses.forEach((c) => {
          if (c.course_name) courseMap.set(c.course_id, c.course_name);
        });
        intel?.sections.forEach((s) => {
          sectionMap.set(`${s.course_id}__${s.class_id}`, s.class_label ?? '');
        });

        const enriched = await Promise.all(
          sessionsData.map(async (s) => {
            const [course, cls] = await Promise.all([
              api.courseDetails(s.course_id).catch(() => undefined),
              api.classDetails(s.class_id).catch(() => undefined),
            ]);
            if (course && courseMap.has(s.course_id)) {
              course.name = courseMap.get(s.course_id) ?? course.name;
            }
            return {
              ...s,
              course,
              class: cls,
              _sectionLabel: sectionMap.get(`${s.course_id}__${s.class_id}`),
            };
          })
        );
        setSessions(enriched);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = sessions;
    if (statusFilter !== 'all') {
      list = list.filter((s) => {
        if (statusFilter === 'completed')
          return s.status === 'completed' || s.status === 'finished';
        return s.status === statusFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.course?.name?.toLowerCase().includes(q) ||
          s.course_id.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessions, statusFilter, search]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-600">Active</Badge>;
      case 'incoming':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'completed':
      case 'finished':
        return <Badge variant="outline">Finished</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading sessions…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      <PageHeader
        title="Department sessions"
        description="Read-only oversight of every attendance session in your department."
      />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search course or session…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="incoming">Scheduled</SelectItem>
            <SelectItem value="completed">Finished</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 w-12">#</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="pr-6 text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s, idx) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-6 text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{s.course?.name ?? 'Unknown course'}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {s.course?.course_id ?? s.course_id.slice(0, 8)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {s.class ? `Year ${s.class.year} · Sec ${s.class.section}` : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{statusBadge(s.status)}</TableCell>
                  <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No sessions match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
