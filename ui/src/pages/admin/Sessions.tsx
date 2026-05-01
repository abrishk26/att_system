import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { Session, Assignment, Course, Class } from '../../api';
import { useAuth } from '../../AuthContext';
import './Sessions.css';

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

  if (loading) return <div className="loading">Loading sessions...</div>;

  return (
    <div className="sessions-page">
      <div className="page-header">
        <div>
          <h2>Sessions</h2>
          <p className="page-sub">Manage your attendance sessions</p>
        </div>
        <div className="create-session">
          <select
            value={selectedAssignment}
            onChange={e => setSelectedAssignment(e.target.value)}
            className="assignment-select"
          >
            <option value="">Select assignment...</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                Assignment {a.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleCreate} disabled={!selectedAssignment || creating}>
            {creating ? 'Creating...' : '+ New Session'}
          </button>
        </div>
      </div>

      <div className="sessions-table-wrap">
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Class</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="cell-main">{s.course?.name ?? 'Unknown'}</div>
                  <div className="cell-sub">{s.course?.course_id}</div>
                </td>
                <td>
                  {s.class ? `Year ${s.class.year} · Section ${s.class.section}` : '—'}
                </td>
                <td>
                  <span className={`badge badge-${s.status}`}>{s.status}</span>
                </td>
                <td>
                  <div className="action-btns">
                    {s.status === 'incoming' && (
                      <button className="btn-sm btn-green" onClick={() => handleStatusChange(s.id, 'active')}>
                        Start
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button className="btn-sm btn-purple" onClick={() => handleStatusChange(s.id, 'completed')}>
                        End
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={4} className="empty-state">No sessions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
