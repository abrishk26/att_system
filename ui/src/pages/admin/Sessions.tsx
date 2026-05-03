import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Session, Assignment, Course, Class } from '../../api';
import { useAuth } from '../../AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Calendar, Play, Square, Loader2, Plus } from 'lucide-react';

interface EnrichedSession extends Session {
  course?: Course;
  class?: Class;
}

export default function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, assignmentsData] = await Promise.all([
        api.instructorSessions(),
        api.instructorAssignments(),
      ]);
      setAssignments(assignmentsData);

      const enriched = await Promise.all(
        sessionsData.map(async (s) => {
          const [course, cls] = await Promise.all([
            api.courseDetails(s.course_id).catch(() => undefined),
            api.classDetails(s.class_id).catch(() => undefined),
          ]);
          return { ...s, course, class: cls };
        })
      );
      setSessions(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedAssignment || !user) return;
    const a = assignments.find(a => a.id === selectedAssignment);
    if (!a) return;
    setCreating(true);
    try {
      await api.createSession({ instructor_id: user.id, class_id: a.class_id, course_id: a.course_id });
      await loadData();
      setSelectedAssignment('');
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (sessionId: string, status: string) => {
    try {
      await api.updateSession(sessionId, status);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
      case 'incoming': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">Incoming</Badge>;
      case 'completed':
      case 'finished': return <Badge variant="outline" className="text-slate-500 border-slate-200">Finished</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-slate-500 font-medium">Loading sessions...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Sessions</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time management of class attendance tracking</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
            <SelectTrigger className="w-full sm:w-[280px] h-11 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Select Course & Section" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
                {assignments.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                        Assignment {a.id.slice(0, 8).toUpperCase()}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleCreate} 
            disabled={!selectedAssignment || creating}
            className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all active:scale-95"
          >
            {creating ? <Loader2 className="animate-spin mr-2" size={18} /> : <Plus size={18} className="mr-2" />}
            New Session
          </Button>
        </div>
      </div>

      <Card className="border-slate-50 shadow-md overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 px-6">#</TableHead>
                <TableHead className="font-bold text-slate-500">Course Details</TableHead>
                <TableHead className="font-bold text-slate-500">Class Section</TableHead>
                <TableHead className="font-bold text-slate-500 text-center">Status</TableHead>
                <TableHead className="text-right px-6 font-bold text-slate-500">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s, idx) => (
                <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 font-bold text-slate-400">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{s.course?.name ?? 'Unknown Course'}</span>
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-tighter">{s.course?.course_id ?? s.course_id.substring(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm font-medium">
                            {s.class ? `Year ${s.class.year} · Sec ${s.class.section}` : 'N/A'}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(s.status)}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-2">
                      {s.status === 'incoming' && (
                        <Button 
                            size="sm" 
                            variant="default"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 font-bold px-4"
                            onClick={() => handleStatusChange(s.id, 'active')}
                        >
                          <Play size={14} className="mr-1" /> Start
                        </Button>
                      )}
                      {s.status === 'active' && (
                        <Button 
                            size="sm" 
                            variant="destructive"
                            className="rounded-lg h-8 font-bold px-4 shadow-lg shadow-rose-200"
                            onClick={() => handleStatusChange(s.id, 'completed')}
                        >
                          <Square size={14} className="mr-1" /> End
                        </Button>
                      )}
                      {(s.status === 'completed' || s.status === 'finished') && (
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest mr-2">Locked</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-medium">
                        No attendance sessions found.
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
