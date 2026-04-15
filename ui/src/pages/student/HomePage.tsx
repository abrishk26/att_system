import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAttendance } from '../../hooks/student/useAttendance';
import { useSchedule } from '../../hooks/student/useSchedule';
import { useNotifs } from '../../hooks/student/useNotifs';
import { UpcomingClassCard } from '../../components/student/home/UpcomingClassCard';
import { NotificationListItem } from '../../components/student/home/NotificationListItem';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  Calendar, 
  Bell, 
  TrendingUp,
  BookOpen,
  Clock
} from 'lucide-react';

interface StudentContext {
    studentId: string;
}

const HomePage: React.FC = () => {
  const { studentId } = useOutletContext<StudentContext>();
  const { history, isLoading: attendanceLoading } = useAttendance(studentId);
  const { todayClasses, isLoading: scheduleLoading } = useSchedule(studentId);
  const { notifications, isLoading: notifsLoading } = useNotifs(studentId);

  // Calculate overall attendance percentage
  const overallAttendance = React.useMemo(() => {
    if (!history || history.length === 0) return { attendancePercentage: 0, totalPresent: 0 };
    const totalSessions = history.reduce((acc, course) => acc + course.totalSessions, 0);
    const totalPresent = history.reduce((acc, course) => acc + course.present, 0);
    return {
        attendancePercentage: totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0,
        totalPresent: totalPresent
    }
  }, [history]);

  const isLoading = attendanceLoading || scheduleLoading || notifsLoading;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="section-shell">
        {/* Header Skeleton */}
        <div className="animate-pulse rounded-2xl bg-[var(--aau-primary)] p-6 text-white">
          <div className="mb-2 h-7 w-56 rounded bg-white/25"></div>
          <div className="h-3.5 w-72 rounded bg-white/25"></div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="panel-card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        
        {/* Classes Skeleton */}
        <div className="panel-card animate-pulse">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="section-shell">
        
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-[var(--aau-primary)] p-6 text-white shadow-[var(--aau-shadow-strong)] md:p-8">
          <div className="relative z-10">
            <p className="text-sm font-medium text-white/80 md:text-base">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
            </p>
            <h1 className="mb-1 mt-2 text-2xl font-bold md:text-3xl lg:text-4xl">
              {getGreeting()}, Student!
            </h1>
            <p className="text-sm text-white/85 md:text-base">
              Ready to make today productive? Let's check your progress.
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-white/5"></div>
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[var(--aau-accent)]/20"></div>
        </div>

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="panel-card fade-in-up relative">
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[var(--aau-accent)]/10"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--aau-muted)] md:text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Overall Attendance
                </p>
                <p className="text-3xl font-bold text-[var(--aau-primary)] md:text-4xl lg:text-5xl">
                  {overallAttendance.attendancePercentage}%
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dbe6ff]">
                  <div 
                    className="h-full rounded-full bg-[var(--aau-accent)] transition-all duration-500"
                    style={{ width: `${overallAttendance.attendancePercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8efff] md:h-14 md:w-14">
                <TrendingUp className="h-6 w-6 text-[var(--aau-primary)] md:h-7 md:w-7" />
              </div>
            </div>
          </div>

          <div className="panel-card fade-in-up relative">
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[var(--aau-primary)]/8"></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--aau-muted)] md:text-sm">
                  <BookOpen className="w-4 h-4" />
                  Classes Attended
                </p>
                <p className="text-3xl font-bold text-[var(--aau-primary)] md:text-4xl lg:text-5xl">
                  {overallAttendance.totalPresent}
                </p>
                <p className="mt-1 text-xs text-[var(--aau-muted)] md:text-sm">
                  total sessions
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8efff] md:h-14 md:w-14">
                <BookOpen className="h-6 w-6 text-[var(--aau-primary)] md:h-7 md:w-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Classes Section */}
        <div className="panel-card fade-in-up">
          <div className="mb-4 flex items-center justify-between md:mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#d9ebff] md:h-10 md:w-10">
                <Calendar className="h-4 w-4 text-[var(--aau-primary)] md:h-5 md:w-5" />
              </div>
              <h2 className="text-lg font-bold text-[var(--aau-text)] md:text-xl">Today's Classes</h2>
            </div>
            <Link 
              to="/student/schedule" 
              className="group flex items-center gap-1 text-sm font-semibold text-[var(--aau-primary)] transition-colors hover:text-[var(--aau-primary-dark)] md:text-base"
            >
              View All 
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {todayClasses.length > 0 ? (
              todayClasses.map((cls, index) => (
                <div 
                  key={cls.classId}
                  className="fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <UpcomingClassCard classInfo={cls} />
                </div>
              ))
            ) : (
              <div className="text-center py-8 md:py-12">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2f7] md:h-20 md:w-20">
                  <Clock className="h-8 w-8 text-gray-400 md:h-10 md:w-10" />
                </div>
                <p className="font-medium text-[var(--aau-muted)]">No classes scheduled for today</p>
                <p className="mt-1 text-sm text-gray-400">Enjoy your free time!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications Section */}
        <div className="panel-card fade-in-up">
          <div className="mb-4 flex items-center justify-between md:mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#d9ebff] md:h-10 md:w-10">
                <Bell className="h-4 w-4 text-[var(--aau-primary)] md:h-5 md:w-5" />
              </div>
              <h2 className="text-lg font-bold text-[var(--aau-text)] md:text-xl">Recent Notifications</h2>
              {notifications.length > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </div>
            <Link 
              to="/student/notifications" 
              className="group flex items-center gap-1 text-sm font-semibold text-[var(--aau-primary)] transition-colors hover:text-[var(--aau-primary-dark)] md:text-base"
            >
              View All 
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="space-y-2">
            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((notif, index) => (
                <div 
                  key={notif.notificationId}
                  className="fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <NotificationListItem notification={notif} />
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2f7]">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-[var(--aau-muted)]">No new notifications</p>
                <p className="mt-1 text-sm text-gray-400">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;