import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { api, type Course, type Session, type AttendanceRecord, type Permission } from '../../api';
import {
  ArrowLeft,
  ShieldAlert,
  Plus,
  MessageSquare,
  FileUp,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search
} from 'lucide-react';

const PermissionsPage: React.FC = () => {
  const { studentId: _studentId } = useOutletContext<{ studentId: string }>();
  const navigate = useNavigate();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [courseList, sessionList, recordList, permissionList] = await Promise.all([
          api.studentCourses(),
          api.studentSessionsFull(),
          api.studentSessions(),
          api.studentPermissions()
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

  // Filter sessions based on selected course and student enrollment
  const filteredSessions = React.useMemo(() => {
    if (!selectedCourse) return [];
    const studentSessionIds = new Set(myRecords.map(r => r.session_id));
    return sessions.filter(s => s.course_id === selectedCourse && studentSessionIds.has(s.id));
  }, [selectedCourse, sessions, myRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !reason) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('session_id', selectedSession);
      formData.append('description', reason);
      if (file) formData.append('file', file);

      await api.createPermission(formData);

      // Refresh permissions
      const updated = await api.studentPermissions();
      setPermissions(updated);

      // Reset form
      setSelectedCourse('');
      setSelectedSession('');
      setReason('');
      setFile(null);
      setShowModal(false);
      setSuccessMessage('Permission request submitted successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase flex items-center gap-1.5"><CheckCircle2 size={12} /> Approved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-[10px] font-bold uppercase flex items-center gap-1.5"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase flex items-center gap-1.5"><Clock size={12} /> Pending</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-2xl"></div>
        <div className="h-96 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Simplified Header */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Permission requests</h1>
            <p className="text-slate-500 text-sm font-medium">Manage and track your absence justifications</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary transition-colors shadow-lg shadow-slate-200"
        >
          <Plus size={18} />
          New request
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {/* Permissions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="text-primary" size={20} />
            Recent Requests
          </h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{permissions.length} total</span>
        </div>

        {permissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Course & Session</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {permissions.map((req) => {
                  const course = courses.find(c => sessions.find(s => s.id === req.session_id)?.course_id === c.id);
                  return (
                    <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-bold text-slate-900 leading-none">{course?.name || 'Unknown Course'}</h3>
                              <ChevronRight size={14} className="text-slate-300" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">SESS-{req.session_id.slice(0, 4)}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 italic">Course Code: {course?.course_id || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        <p className="text-sm text-slate-500 line-clamp-2">{req.description}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="inline-block">
                          {getStatusBadge(req.status)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 grayscale opacity-50">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No permission requests yet</p>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Permission Request</h3>
                <p className="text-sm text-slate-500 font-medium">Explain your absence for a class session</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 hover:text-red-500 transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.05em] ml-1">Select Course</label>
                  <div className="relative">
                    <select
                      value={selectedCourse}
                      onChange={(e) => {
                        setSelectedCourse(e.target.value);
                        setSelectedSession('');
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold appearance-none focus:border-primary/30 focus:bg-white focus:outline-none transition-all cursor-pointer"
                      required
                    >
                      <option value="">Course...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.course_id}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.05em] ml-1">Select Session</label>
                  <div className="relative">
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      disabled={!selectedCourse || filteredSessions.length === 0}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold appearance-none focus:border-primary/30 focus:bg-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      required
                    >
                      <option value="">Session...</option>
                      {filteredSessions.map(s => (
                        <option key={s.id} value={s.id}>Class {s.id.slice(0, 8)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.05em] ml-1">Reason for Absence</label>
                <div className="relative">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm text-slate-900 font-medium focus:border-primary/30 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300 min-h-[120px] resize-none"
                    placeholder="Provide a detailed explanation..."
                    required
                  />
                  <MessageSquare className="absolute right-4 top-4 text-slate-200" size={18} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.05em] ml-1">Attachment (Optional)</label>
                <label className="flex items-center gap-3 w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-primary/30 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shrink-0">
                    <FileUp size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-slate-700">
                      {file ? file.name : "Click to upload evidence"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium italic">Supports PDF, JPG, PNG</p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-50 text-slate-600 rounded-xl py-3.5 font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSession}
                  className="flex-[2] bg-slate-900 text-white rounded-xl py-3.5 font-bold text-sm hover:bg-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
