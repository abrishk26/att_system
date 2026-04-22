import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  BarChart3,
  Clock,
  Calendar,
  Layers
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'student',
      title: 'Student Portal',
      description: 'Access your courses, track your attendance, and manage permissions.',
      icon: GraduationCap,
      path: '/student/login',
      color: 'bg-indigo-50 text-indigo-600',
      hover: 'hover:border-indigo-200 hover:shadow-indigo-100'
    },
    {
      id: 'instructor',
      title: 'Instructor Portal',
      description: 'Mark attendance, manage class sessions, and monitor student progress.',
      icon: UserCheck,
      path: '/instructor/login',
      color: 'bg-emerald-50 text-emerald-600',
      hover: 'hover:border-emerald-200 hover:shadow-emerald-100'
    },
    {
      id: 'admin',
      title: 'Admin Console',
      description: 'System-wide analytics, staff management, and comprehensive reports.',
      icon: ShieldCheck,
      path: '/admin/login',
      color: 'bg-slate-50 text-slate-600',
      hover: 'hover:border-slate-300 hover:shadow-slate-100'
    }
  ];

  const features = [
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time data visualization of attendance trends.' },
    { icon: Clock, title: 'Instant Tracking', desc: 'Fast and secure attendance marking for every session.' },
    { icon: Calendar, title: 'Schedule Management', desc: 'Automated class scheduling and synchronization.' },
    { icon: Layers, title: 'Role Mapping', desc: 'Seamless integration for students, faculty, and staff.' }
  ];

  return (
    <div className="min-height-screen flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10 animate-fade-in-up">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 animate-float">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next Generation Attendance System
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Streamline your campus <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              with Smart Attendance
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-12 leading-relaxed">
            The most advanced and intuitive platform for managing student attendance,
            analytics, and digital permissions in one unified ecosystem.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-premium-primary"
            >
              Get Started
            </button>
            <button className="btn-premium-secondary">
              View Features
            </button>
          </div>
        </div>

        {/* Abstract Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-0 opacity-20 pointer-events-none">
          <div className="absolute top-40 -left-20 w-80 h-80 bg-primary rounded-full blur-[100px]"></div>
          <div className="absolute bottom-20 -right-20 w-80 h-80 bg-secondary rounded-full blur-[100px]"></div>
        </div>
      </section>

      {/* Roles Selection */}
      <section id="roles" className="w-full py-20 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Select Your Role</h2>
            <p className="text-slate-600">Choose your portal to sign in and begin your session.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className={`group flex flex-col p-8 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 card-hover ${role.hover}`}
              >
                <div className={`w-14 h-14 rounded-xl ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <role.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{role.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-8 flex-grow">
                  {role.description}
                </p>
                <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform">
                  Access Portal <ChevronRight size={20} className="ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {features.map((feature, idx) => (
              <div key={idx} className="flex flex-col">
                <div className="text-primary mb-4 p-3 bg-white w-fit rounded-lg shadow-sm border border-slate-100">
                  <feature.icon size={24} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-border-light bg-slate-50/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <GraduationCap size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight">Smart Campus</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Smart Campus Management System. Built for excellence.
          </p>
          <div className="flex gap-6 text-slate-400">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
