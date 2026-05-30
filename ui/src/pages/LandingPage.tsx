import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  BarChart3,
  Clock,
  Calendar,
  Layers,
  Sun,
  Moon,
  Wifi,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useDarkMode();

  const roles = [
    {
      id: 'student',
      title: 'Student Portal',
      description:
        'Track your attendance across all courses, submit digital permission requests, and monitor your academic standing in real-time.',
      icon: GraduationCap,
      path: '/student/login',
      accentColor: 'from-indigo-500 to-violet-600',
      lightBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
      shadowHover: 'hover:shadow-indigo-100 dark:hover:shadow-indigo-900/30',
      badge: 'Student',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'instructor',
      title: 'Instructor Portal',
      description:
        'Launch attendance sessions, manage roll calls via NFC or manual entry, review permissions, and generate class performance reports.',
      icon: UserCheck,
      path: '/instructor/login',
      accentColor: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      shadowHover: 'hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30',
      badge: 'Instructor',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'admin',
      title: 'Admin Console',
      description:
        'Oversee university-wide attendance data, manage faculty and students, configure class schedules, and access institutional intelligence dashboards.',
      icon: ShieldCheck,
      path: '/admin/login',
      accentColor: 'from-slate-600 to-slate-800',
      lightBg: 'bg-slate-50 dark:bg-slate-800/40',
      iconColor: 'text-slate-600 dark:text-slate-400',
      borderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
      shadowHover: 'hover:shadow-slate-100 dark:hover:shadow-slate-900/30',
      badge: 'Admin',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Instant NFC Tracking',
      desc: 'Tap-to-mark attendance with NFC cards in under a second — zero friction for students and instructors.',
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      desc: 'Real-time dashboards with attendance trends, anomaly detection, and at-risk student identification.',
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      icon: Clock,
      title: 'Offline Sync',
      desc: 'Keep recording attendance even without internet. Records sync automatically when connectivity resumes.',
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      icon: Calendar,
      title: 'Schedule Integration',
      desc: 'Automated session creation based on your class timetable — no manual setup required per session.',
      color: 'text-violet-500 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    {
      icon: Users,
      title: 'Permission Workflow',
      desc: 'Students submit digital absence requests; instructors approve or reject with full audit trails.',
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      icon: Layers,
      title: 'Role-Based Access',
      desc: 'Three secure portals for students, instructors, and admins — each with exactly the right permissions.',
      color: 'text-cyan-500 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    },
  ];

  const stats = [
    { label: 'Students Tracked', value: '2,400+', icon: Users },
    { label: 'Sessions Per Day', value: '120+', icon: Clock },
    { label: 'Avg. Attendance Rate', value: '94.7%', icon: TrendingUp },
    { label: 'NFC Tap Accuracy', value: '99.9%', icon: Wifi },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300 w-full overflow-x-hidden">

      {/* ── Sticky Navigation ───────────────────────────────────── */}
      <header className="w-full sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/60 dark:border-slate-800/60 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <GraduationCap size={20} />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white block leading-none">
                Digital
              </span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                Attendance System
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all duration-200"
            >
              Sign In
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark
                ? <Sun size={18} className="text-amber-400" />
                : <Moon size={18} />
              }
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────── */}
      <section className="w-full pt-24 pb-20 px-6 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/20 to-violet-500/10 dark:from-indigo-600/15 dark:to-violet-700/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-400/15 to-cyan-400/10 dark:from-emerald-600/10 dark:to-cyan-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-400/5 to-violet-500/5 dark:from-indigo-600/5 dark:to-violet-600/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 animate-fade-in-up">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            Next-Generation Campus Attendance Platform
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.08]">
            Attendance that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500">
              just works.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
            A unified platform for students, instructors, and administrators to manage attendance,
            permissions, and analytics — powered by NFC and backed by real-time data.
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-10">
            {[
              'NFC-Powered Check-in',
              'Role-Based Portals',
              'Real-Time Analytics',
              'Offline Sync',
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-200 active:scale-95"
            >
              Access Your Portal
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all duration-200 active:scale-95"
            >
              Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────────── */}
      <section className="w-full py-10 px-6 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center gap-1">
              <stat.icon size={18} className="text-indigo-500 dark:text-indigo-400 mb-1" />
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role Selection ──────────────────────────────────────── */}
      <section id="roles" className="w-full py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Who Are You?
            </p>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Choose your portal
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Each role has a tailored experience with exactly the right tools and data access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className={`group relative flex flex-col text-left p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl ${role.shadowHover} ${role.borderHover} transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              >
                {/* Gradient top bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-3xl`} />

                {/* Badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${role.badgeBg}`}>
                    {role.badge}
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-200"
                  />
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${role.lightBg} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200`}>
                  <role.icon size={26} className={role.iconColor} />
                </div>

                {/* Text */}
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
                  {role.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm flex-grow">
                  {role.description}
                </p>

                {/* CTA */}
                <div className={`mt-6 flex items-center gap-2 font-bold text-sm ${role.iconColor} group-hover:gap-3 transition-all duration-200`}>
                  Sign In <ArrowRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────── */}
      <section id="features" className="w-full py-24 px-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-3">
              Capabilities
            </p>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Everything you need
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Built for modern institutions — fast, reliable, and designed for every stakeholder.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group flex flex-col gap-4 p-7 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200"
              >
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon size={22} className={feature.color} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{feature.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <section className="w-full py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-10 text-center bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 shadow-2xl shadow-indigo-500/25">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-8 w-32 h-32 border-2 border-white rounded-full" />
              <div className="absolute bottom-4 right-8 w-48 h-48 border-2 border-white rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white rounded-full" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Ready to modernize your attendance?
              </h2>
              <p className="text-indigo-200 mb-8 text-lg max-w-xl mx-auto leading-relaxed">
                Select your portal above and sign in to start tracking, reporting, and improving campus attendance today.
              </p>
              <button
                onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-colors duration-200 shadow-lg active:scale-95"
              >
                Get Started Now
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="w-full py-12 px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
              <GraduationCap size={16} />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                Digital
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Attendance System
              </span>
            </div>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center">
            © 2026 Digital Attendance System. Built for academic excellence.
          </p>
          <div className="flex gap-6 text-sm font-medium text-slate-400 dark:text-slate-500">
            <a href="#" className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
