import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import type { SessionRecord } from '../../lib/types/student';
import { AttendanceDonutChart } from '../../components/student/history/AttendanceDonutChart';
import { SessionRecordRow } from '../../components/student/history/SessionRecordRow';
import { ArrowLeft } from 'lucide-react';

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { getCourseDetail } = useAttendance(studentId);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
        navigate('/student/history');
        return;
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const sessionData = await getCourseDetail(courseId);
        setSessions(sessionData);
      } catch (err) {
        setError('Failed to load session details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [courseId, getCourseDetail, navigate]);

  // Calculate statistics for the donut chart
  const stats = React.useMemo(() => {
    const total = sessions.length;
    const present = sessions.filter(s => s.status === 'present').length;
    const late = sessions.filter(s => s.status === 'late').length;
    const absent = sessions.filter(s => s.status === 'absent').length;
    const excused = sessions.filter(s => s.status === 'excused').length;
    return { total, present, late, absent, excused };
  }, [sessions]);

  const chartData = [
    { name: 'Present', value: stats.present, fill: '#10B981' }, // green-500
    { name: 'Late', value: stats.late, fill: '#F59E0B' },       // amber-500
    { name: 'Absent', value: stats.absent, fill: '#EF4444' },   // red-500
    { name: 'Excused', value: stats.excused, fill: '#3B82F6' }, // blue-500
  ];

  if (isLoading) {
    return <div className="page-shell"><div className="section-shell"><p className="panel-card text-center text-[var(--aau-muted)]">Loading details...</p></div></div>;
  }

  if (error) {
    return <div className="page-shell"><div className="section-shell"><p className="panel-card text-center text-red-500">{error}</p></div></div>;
  }

  const courseName = sessions.length > 0 ? sessions[0].courseName : 'Course';

  return (
    <div className="page-shell">
      <div className="section-shell">
        <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="btn-secondary !p-2" title="Go back"><ArrowLeft size={20}/></button>
            <div>
              <h1 className="panel-title">{courseName}</h1>
              <p className="panel-subtitle">Course session performance and attendance status.</p>
            </div>
        </div>

      {/* Donut Chart */}
      <div className="panel-card my-0 flex justify-center">
        <AttendanceDonutChart data={chartData} total={stats.total} />
      </div>

      {/* Session List */}
      <h2 className="text-lg font-semibold text-[var(--aau-text)]">Session Records</h2>
      <div className="space-y-3">
        {sessions.map((session, index) => (
          <SessionRecordRow key={index} session={session} />
        ))}
      </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
