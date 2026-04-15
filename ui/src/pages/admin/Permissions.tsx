import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { PermissionWithStudent, Session, Course } from '../../api';
import './Permissions.css';

interface EnrichedSession extends Session {
  course?: Course;
}

export default function Permissions() {
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [permissions, setPermissions] = useState<PermissionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);

  useEffect(() => {
    api.instructorSessions().then(async (data) => {
      const enriched = await Promise.all(
        data.map(async (s) => {
          const course = await api.courseDetails(s.course_id).catch(() => undefined);
          return { ...s, course };
        })
      );
      setSessions(enriched);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!selectedSession) {
        Promise.resolve().then(() => {
          if (cancelled) return;
          setPermissions([]);
          setLoadingPerms(false);
        });
        return;
      }

      setLoadingPerms(true);
      try {
        const res = await api.permissionsBySession(selectedSession);
        if (!cancelled) setPermissions(res);
      } catch {
        if (!cancelled) setPermissions([]);
      } finally {
        if (!cancelled) setLoadingPerms(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedSession]);

  const handleUpdate = async (id: string, status: string) => {
    try {
      await api.updatePermission(id, status);
      setPermissions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="permissions-page">
      <div className="page-header">
        <div>
          <h2>Permission Requests</h2>
          <p className="page-sub">Review and manage student permission requests</p>
        </div>
      </div>

      <div className="session-picker">
        <label>Select Session</label>
        <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="assignment-select">
          <option value="">Choose a session...</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.course?.name ?? 'Unknown'} · {s.status}
            </option>
          ))}
        </select>
      </div>

      {loadingPerms && <div className="loading">Loading permissions...</div>}

      {!loadingPerms && selectedSession && (
        <div className="perms-table-wrap">
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(p => (
                <tr key={p.id}>
                  <td className="cell-main">{p.student_name}</td>
                  <td style={{ color: '#9ca3af', maxWidth: 300 }}>{p.description}</td>
                  <td><span className={`badge badge-perm-${p.status}`}>{p.status}</span></td>
                  <td>
                    {p.status === 'pending' && (
                      <div className="action-btns">
                        <button className="btn-sm btn-green" onClick={() => handleUpdate(p.id, 'approved')}>Approve</button>
                        <button className="btn-sm btn-red" onClick={() => handleUpdate(p.id, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {permissions.length === 0 && (
                <tr><td colSpan={4} className="empty-state">No permission requests for this session.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!selectedSession && (
        <div className="empty-prompt">Select a session to view permission requests.</div>
      )}
    </div>
  );
}
