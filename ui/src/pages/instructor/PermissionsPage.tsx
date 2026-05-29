import { useEffect, useState, type ReactElement } from 'react';
import { api } from '../../api';
import type { PermissionWithStudent, Session, Course } from '../../api';
import { ShieldCheck, Clock, CheckCircle, XCircle, ChevronDown, FileText, User, Eye, X, ExternalLink } from 'lucide-react';

interface EnrichedSession extends Session {
  course?: Course;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<string, ReactElement> = {
  pending: <Clock size={12} />,
  accepted: <CheckCircle size={12} />,
  rejected: <XCircle size={12} />,
};

export default function InstructorPermissionsPage() {
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [permissions, setPermissions] = useState<PermissionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingPermission, setViewingPermission] = useState<PermissionWithStudent | null>(null);

  useEffect(() => {
    api.instructorSessions()
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

    const fetchPromise = selectedSession
      ? api.permissionsBySession(selectedSession)
      : api.allPermissions();

    fetchPromise
      .then((res) => { if (!cancelled) setPermissions(res); })
      .catch(() => { if (!cancelled) setPermissions([]); })
      .finally(() => { if (!cancelled) setLoadingPerms(false); });
    return () => { cancelled = true; };
  }, [selectedSession]);

  const handleUpdate = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.updatePermission(id, status);
      setPermissions((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = permissions.filter((p) => p.status === 'pending');
  const resolved = permissions.filter((p) => p.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-3">
          <ShieldCheck className="text-primary" size={30} />
          Permission Requests
        </h1>
        <p className="text-slate-500">Review and manage student absence permission requests for your sessions.</p>
      </div>

      {/* Session Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Select a Session</label>
        <div className="relative max-w-md">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="">Choose a session…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course?.name ?? s.course_id} · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* No selection summary */}
      {!selectedSession && permissions.length > 0 && (
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-primary font-medium text-sm">
            Showing all <span className="font-bold">{permissions.length}</span> requests across all your sessions.
          </p>
          <button
            onClick={() => setSelectedSession(sessions[0]?.id || '')}
            className="text-xs font-bold text-primary hover:underline"
          >
            Filter by session
          </button>
        </div>
      )}

      {/* Loading */}
      {loadingPerms && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Permissions content */}
      {!loadingPerms && (
        <div className="space-y-6">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-3">
            {(['pending', 'accepted', 'rejected'] as const).map((s) => {
              const count = permissions.filter((p) => p.status === s).length;
              return (
                <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold capitalize ${STATUS_STYLES[s]}`}>
                  {STATUS_ICONS[s]}
                  {count} {s}
                </div>
              );
            })}
          </div>

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Pending Requests
              </h2>
              <div className="space-y-3">
                {pending.map((p) => (
                  <PermissionCard
                    key={p.id}
                    permission={p}
                    onUpdate={handleUpdate}
                    isUpdating={updatingId === p.id}
                    sessionInfo={sessions.find(s => s.id === p.session_id)}
                    onViewDetails={setViewingPermission}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-slate-400" /> Resolved
              </h2>
              <div className="space-y-3">
                {resolved.map((p) => (
                  <PermissionCard
                    key={p.id}
                    permission={p}
                    onUpdate={handleUpdate}
                    isUpdating={updatingId === p.id}
                    sessionInfo={sessions.find(s => s.id === p.session_id)}
                    onViewDetails={setViewingPermission}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {permissions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <FileText size={36} className="text-slate-300 mb-3" />
              <p className="text-slate-400 font-medium">{selectedSession ? 'No permission requests for this session.' : 'No pending permission requests.'}</p>
            </div>
          )}
        </div>
      )}

      {/* View Details Modal - Clean overlay */}
      {viewingPermission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setViewingPermission(null)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setViewingPermission(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-all shadow-sm"
            >
              <X size={16} />
            </button>

            {/* Image section */}
            {viewingPermission.img_url ? (
              <div className="relative bg-slate-100">
                <img
                  src={`/${viewingPermission.img_url}`}
                  alt="Attached evidence"
                  className="w-full h-64 object-contain bg-slate-50"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = '<div class="w-full h-64 flex items-center justify-center bg-slate-50"><p class="text-slate-400 text-sm">Image could not be loaded</p></div>';
                  }}
                />
                <button
                  onClick={() => window.open(`/${viewingPermission.img_url}`, '_blank')}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-all shadow-sm"
                >
                  <ExternalLink size={12} /> Open full size
                </button>
              </div>
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                  <FileText size={32} className="text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">No attachment</p>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="p-6 space-y-4">
              {/* Student + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {viewingPermission.student_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{viewingPermission.student_name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">ID: {viewingPermission.student_id.slice(0, 8)}…</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${STATUS_STYLES[viewingPermission.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {STATUS_ICONS[viewingPermission.status]}
                  {viewingPermission.status}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason</p>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                  {viewingPermission.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionCard({
  permission,
  onUpdate,
  isUpdating,
  sessionInfo,
  onViewDetails,
}: {
  permission: PermissionWithStudent;
  onUpdate: (id: string, status: string) => void;
  isUpdating: boolean;
  sessionInfo?: Session & { course?: Course };
  onViewDetails: (p: PermissionWithStudent) => void;
}) {
  const isPending = permission.status === 'pending';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col sm:flex-row sm:items-start gap-4 hover:shadow-md transition-all">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
        <User size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-bold text-slate-900">{permission.student_name}</span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold capitalize ${STATUS_STYLES[permission.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {STATUS_ICONS[permission.status]}
            {permission.status}
          </span>
          {sessionInfo?.course && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold uppercase tracking-tight">
              {sessionInfo.course.name}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{permission.description}</p>
        <button
          onClick={() => onViewDetails(permission)}
          className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary font-semibold hover:underline transition-colors"
        >
          <Eye size={12} /> View details
        </button>
      </div>

      {/* Actions - on the card */}
      {isPending && (
        <div className="flex gap-2 shrink-0">
          <button
            disabled={isUpdating}
            onClick={() => onUpdate(permission.id, 'accepted')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100 transition-all disabled:opacity-50"
          >
            <CheckCircle size={14} /> Approve
          </button>
          <button
            disabled={isUpdating}
            onClick={() => onUpdate(permission.id, 'rejected')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
          >
            <XCircle size={14} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
