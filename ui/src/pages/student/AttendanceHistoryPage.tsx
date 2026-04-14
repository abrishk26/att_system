import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import { CourseAttendanceRow } from '../../components/student/history/CourseAttendanceRow';
import { ArrowLeft } from 'lucide-react';

const AttendanceHistoryPage: React.FC = () => {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { history, isLoading, error } = useAttendance(studentId);
  const navigate = useNavigate();

  const handleCourseClick = (courseId: string) => {
    navigate(`/student/course/${courseId}`);
  };

  return (
    <div className="page-shell">
      <div className="section-shell">
        <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="btn-secondary !p-2" title="Go back"><ArrowLeft size={20}/></button>
            <div>
              <h1 className="panel-title">Attendance History</h1>
              <p className="panel-subtitle">Review your attendance across all courses.</p>
            </div>
        </div>

      {isLoading && <p className="panel-card text-center text-[var(--aau-muted)]">Loading attendance history...</p>}
      {error && <p className="panel-card text-center text-red-500">Failed to load history.</p>}

      {!isLoading && !error && (
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map(course => (
              <CourseAttendanceRow 
                key={course.courseId} 
                courseStats={course} 
                onClick={() => handleCourseClick(course.courseId)}
              />
            ))
          ) : (
            <p className="panel-card py-8 text-center text-[var(--aau-muted)]">No attendance records found.</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default AttendanceHistoryPage;
