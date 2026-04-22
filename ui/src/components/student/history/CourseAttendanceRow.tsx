import React from 'react';
import type { CourseAttendance } from '../../../lib/types/student';
import { ChevronRight } from 'lucide-react';
import './CourseAttendanceRow.css';

interface CourseAttendanceRowProps {
  courseStats: CourseAttendance;
  onClick: () => void;
}

export const CourseAttendanceRow: React.FC<CourseAttendanceRowProps> = ({ courseStats, onClick }) => {
  const { courseName, present, totalSessions } = courseStats;
  const attendancePercentage = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'progress--high';
    if (percentage >= 75) return 'progress--medium';
    return 'progress--low';
  };

  return (
    <div onClick={onClick} className="cursor-pointer rounded-2xl border border-[var(--aau-border)] bg-white p-4 shadow-[var(--aau-shadow)] transition-shadow hover:shadow-md">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="font-bold text-[var(--aau-text)]">{courseName}</h3>
            <p className="mt-1 text-sm text-[var(--aau-muted)]">
                Attendance: <span className="font-semibold">{attendancePercentage}%</span> ({present}/{totalSessions} classes)
            </p>
        </div>
        <ChevronRight className="text-[var(--aau-primary)]" />
      </div>
      <progress
        className={`course-attendance-progress mt-3 ${getProgressBarColor(attendancePercentage)}`}
        value={attendancePercentage}
        max={100}
        aria-label={`${courseName} attendance progress`}
      />
    </div>
  );
};
