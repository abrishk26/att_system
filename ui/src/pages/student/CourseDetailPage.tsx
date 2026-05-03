import React from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import { AttendanceDonutChart } from '../../components/student/history/AttendanceDonutChart';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  BookOpen,
  PieChart as PieIcon,
  ListFilter
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { studentId } = useOutletContext<{ studentId: string }>();
  const { getCourseDetail } = useAttendance(studentId);
  const navigate = useNavigate();

  const [sessions, setSessions] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
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
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [courseId, getCourseDetail, navigate]);

  const stats = React.useMemo(() => {
    const total = sessions.length;
    const present = sessions.filter(s => s.status === 'present').length;
    const late = sessions.filter(s => s.status === 'late').length;
    const absent = sessions.filter(s => s.status === 'absent').length;
    const excused = sessions.filter(s => s.status === 'excused').length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, excused, percentage };
  }, [sessions]);

  const chartData = [
    { name: 'Present', value: stats.present, fill: '#10B981' },
    { name: 'Late', value: stats.late, fill: '#F59E0B' },
    { name: 'Absent', value: stats.absent, fill: '#EF4444' },
    { name: 'Excused', value: stats.excused, fill: '#3B82F6' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-none"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-[400px] bg-slate-100 rounded-none"></div>
          <div className="h-[400px] bg-slate-100 rounded-none"></div>
        </div>
      </div>
    );
  }

  const courseName = sessions.length > 0 ? sessions[0].courseName : 'Course Performance';

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-none border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="w-14 h-14 flex items-center justify-center bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <ArrowLeft size={28} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Course Intelligence</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{courseName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-6 py-4 bg-slate-900 text-white flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Average</span>
            <span className="text-3xl font-black leading-none">{stats.percentage}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Analytics */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white border-2 border-slate-900 p-8 rounded-none shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-8">
              <PieIcon className="text-primary" size={20} />
              <h2 className="font-black uppercase tracking-widest text-sm text-slate-900">Attendance Distribution</h2>
            </div>

            <AttendanceDonutChart data={chartData} total={stats.total} />

            <div className="grid grid-cols-2 gap-4 mt-8">
              {chartData.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100">
                  <div className="w-3 h-3" style={{ backgroundColor: item.fill }}></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{item.name}</p>
                    <p className="text-slate-900 font-black">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <AlertCircle size={32} className="mb-4 text-white/50" />
              <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Stay Eligible</h3>
              <p className="text-white/80 font-medium">To maintain full eligibility for examinations, ensure your total attendance for {courseName} remains above 80%.</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Right: Detailed Logs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border-2 border-slate-900 rounded-none overflow-hidden h-full flex flex-col">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ListFilter size={20} className="text-primary" />
                <h2 className="font-black uppercase tracking-widest text-sm">Session Logs</h2>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {sessions.length > 0 ? (
                <Table>
                  <TableHeader className="bg-slate-900">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-16 text-white/50 pl-6 font-black uppercase text-[10px] tracking-widest">#</TableHead>
                      <TableHead className="text-white font-black uppercase text-[10px] tracking-widest">Date & Time</TableHead>
                      <TableHead className="text-right text-white font-black uppercase text-[10px] tracking-widest pr-6">Attendance Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y-2 divide-slate-50">
                    {sessions.map((session, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 transition-colors h-20">
                        <TableCell className="pl-6 font-black text-slate-400">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900">
                              {session.date === 'TBA' ? 'Recent Session' : new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 mt-1">
                              <Clock size={10} /> {session.startTime || 'Standard Time'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {session.status === 'present' && <Badge className="bg-emerald-500 hover:bg-emerald-600 font-black uppercase text-[10px] tracking-widest">Present</Badge>}
                          {session.status === 'absent' && <Badge variant="destructive" className="font-black uppercase text-[10px] tracking-widest">Absent</Badge>}
                          {session.status === 'late' && <Badge className="bg-amber-500 hover:bg-amber-600 font-black uppercase text-[10px] tracking-widest">Late</Badge>}
                          {session.status === 'excused' && <Badge variant="outline" className="text-blue-500 border-blue-100 font-black uppercase text-[10px] tracking-widest">Excused</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 border-2 border-slate-100 flex items-center justify-center mx-auto mb-6 grayscale text-slate-300">
                    <ListFilter size={40} />
                  </div>
                  <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Empty Log History</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
