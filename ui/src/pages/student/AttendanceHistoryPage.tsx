import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import {
  ArrowLeft,
  BookOpen,
  BarChart3,
  AlertCircle
} from 'lucide-react';

const AttendanceHistoryPage: React.FC = () => {
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { history, isLoading, error } = useAttendance(studentId);
  const navigate = useNavigate();

  const handleCourseClick = (courseId: string) => {
    navigate(`/student/course/${courseId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4 md:p-0">
        <div className="h-20 bg-slate-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-slate-200 rounded-[2rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Simplified Page Header */}
      <div className="flex items-center gap-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Attendance history</h1>
          <p className="text-slate-500 text-sm font-medium">Detailed overview of your course attendance</p>
        </div>
      </div>

      {error ? (
        <div className="glass p-12 text-center rounded-[2rem]">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Failed to load history</h2>
          <p className="text-slate-500">Please try again later or contact support.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Rate</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Stats</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((course) => {
                    const percentage = course.attendancePercentage;
                    const isLow = percentage < 75;
                    const isExcellent = percentage >= 90;

                    return (
                      <tr
                        key={course.courseId}
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => handleCourseClick(course.courseId)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLow ? 'bg-red-50 text-red-500' : isExcellent ? 'bg-emerald-50 text-emerald-500' : 'bg-primary/5 text-primary'
                              }`}>
                              <BookOpen size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{course.courseCode}</p>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {course.courseName}
                              </h3>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-black w-10 ${isLow ? 'text-red-500' : isExcellent ? 'text-emerald-500' : 'text-slate-900'
                              }`}>
                              {percentage}%
                            </span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full min-w-[80px] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isLow ? 'bg-red-500' : isExcellent ? 'bg-emerald-500' : 'bg-primary'
                                  }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{course.present}</span>
                            <span className="text-xs text-slate-300 font-medium italic">/ {course.totalSessions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${isLow ? 'bg-red-50 text-red-600' : isExcellent ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {isLow ? 'Critical' : isExcellent ? 'Excellent' : 'Good'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 text-slate-200">
                <BarChart3 size={40} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">No records found</h2>
              <p className="text-slate-500 text-sm mt-2">You haven't attended any sessions for your courses yet.</p>
              <button
                onClick={() => navigate('/student/home')}
                className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-primary transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceHistoryPage;
