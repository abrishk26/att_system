import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import { useNotifs } from '../../hooks/student/useNotifs';
import { NotificationListItem } from '../../components/student/home/NotificationListItem';
import {
  ChevronRight,
  Calendar,
  Bell,
  TrendingUp,
  BookOpen,
  Clock,
  ArrowUpRight,
  Target
} from 'lucide-react';

interface StudentContext {
  studentId: string;
}

const HomePage: React.FC = () => {
  const { studentId } = useOutletContext<StudentContext>();
  const { history, isLoading: attendanceLoading } = useAttendance(studentId);
  const { notifications, isLoading: notifsLoading } = useNotifs(studentId);

  const overallAttendance = React.useMemo(() => {
    if (!history || history.length === 0) return { attendancePercentage: 0, totalPresent: 0, totalSessions: 0 };
    const totalSessions = history.reduce((acc, course) => acc + course.totalSessions, 0);
    const totalPresent = history.reduce((acc, course) => acc + course.present, 0);
    return {
      attendancePercentage: totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0,
      totalPresent,
      totalSessions
    }
  }, [history]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isLoading = attendanceLoading || notifsLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 md:p-12 text-white shadow-2xl shadow-primary/20">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium mb-6">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            {getGreeting()}, Student!
          </h1>
          <p className="text-white/80 text-lg md:text-xl leading-relaxed">
            Ready to make today productive? Your attendance is looking solid at <span className="text-white font-bold">{overallAttendance.attendancePercentage}%</span>.
          </p>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Attendance Card */}
        <div className="glass rounded-[2rem] p-8 card-hover relative group">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp size={24} />
            </div>
            <div className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold uppercase tracking-wider">
              On Track
            </div>
          </div>
          <div>
            <p className="text-slate-500 font-medium mb-1">Overall Attendance</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-slate-900">{overallAttendance.attendancePercentage}%</h3>
              <ArrowUpRight className="text-success" size={20} />
            </div>
            <div className="mt-6 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-lg shadow-primary/30"
                style={{ width: `${overallAttendance.attendancePercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sessions Card */}
        <div className="glass rounded-[2rem] p-8 card-hover relative group">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <BookOpen size={24} />
            </div>
          </div>
          <div>
            <p className="text-slate-500 font-medium mb-1">Sessions Attended</p>
            <h3 className="text-4xl font-black text-slate-900">{overallAttendance.totalPresent}</h3>
            <p className="text-slate-400 text-sm mt-2 font-medium">Out of {overallAttendance.totalSessions} total sessions</p>
          </div>
        </div>

        {/* Next Goal Card */}
        <div className="glass rounded-[2rem] p-8 card-hover relative group lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Target size={24} />
            </div>
          </div>
          <div>
            <p className="text-slate-500 font-medium mb-1">Target Attendance</p>
            <h3 className="text-4xl font-black text-slate-900">85%</h3>
            <p className="text-slate-400 text-sm mt-2 font-medium">Keep it up to maintain eligibility!</p>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass rounded-[2rem] overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
              <p className="text-sm text-slate-500">Stay updated with class alerts</p>
            </div>
          </div>
          <Link to="/student/notifications" className="text-sm font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-1 group">
            View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="p-8">
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((notif, index) => (
                <div
                  key={notif.notificationId}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <NotificationListItem notification={notif} />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Bell className="text-slate-300" size={32} />
                </div>
                <h3 className="text-slate-900 font-bold">No new notifications</h3>
                <p className="text-slate-500 text-sm">You're all caught up for now!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Card for Free Time (Replaces Classes if empty) */}
      {notifications.length === 0 && (
        <div className="rounded-[2.5rem] bg-slate-900 p-10 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Weekend Vibes?</h2>
            <p className="text-slate-400 mb-6">No scheduled classes right now. Take some time for self-study or relaxation!</p>
            <button className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-100 transition-colors">
              Check Resources
            </button>
          </div>
          <Clock className="absolute top-1/2 right-10 -translate-y-1/2 text-white/5 w-64 h-64 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
        </div>
      )}
    </div>
  );
};

export default HomePage;