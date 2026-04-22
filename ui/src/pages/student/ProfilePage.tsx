import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type UserProfile } from '../../api';
import {
  User,
  Mail,
  ShieldCheck,
  CreditCard,
  LogOut,
  Settings,
  Camera,
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../AuthContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const data = await api.profile();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-2xl"></div>
        <div className="h-64 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <p className="text-slate-900 font-bold">{error || 'Profile not available'}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-primary font-bold hover:underline">Try Again</button>
      </div>
    );
  }

  const fullName = `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="p-8 md:p-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-4xl md:text-5xl font-black text-primary overflow-hidden">
                {profile.img_url ? (
                  <img src={profile.img_url} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  fullName.charAt(0)
                )}
              </div>
              <button className="absolute bottom-2 right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all group-hover:scale-110">
                <Camera size={20} />
              </button>
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full text-[10px] font-black uppercase tracking-widest text-primary mb-4 border border-primary/10">
                <ShieldCheck size={14} />
                {profile.role} Account Verified
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2 leading-none">{fullName}</h1>
              <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2">
                <Mail size={16} /> {profile.username}
              </p>

              <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-4">
                <button className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 transform hover:-translate-y-0.5 active:translate-y-0">
                  Edit Profile <ArrowRight size={18} />
                </button>
                <button className="px-6 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-200">
                  Account Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Identity Details */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-primary">
              <User size={20} />
            </div>
            <h2 className="font-bold text-slate-900 tracking-tight">Identity Information</h2>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Legal Name</p>
              <p className="text-slate-900 font-bold text-lg">{fullName}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student ID Number</p>
              <p className="text-primary font-mono font-bold text-lg bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 inline-block mt-1">
                {profile.id}
              </p>
            </div>
            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                  <Fingerprint size={20} />
                </div>
                <p className="text-sm font-bold text-slate-600">Biometric Auth</p>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Enabled</span>
            </div>
          </div>
        </div>

        {/* Digital ID Card Mockup */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-primary">
              <CreditCard size={20} />
            </div>
            <h2 className="font-bold text-slate-900 tracking-tight">Digital Access Card</h2>
          </div>
          <div className="p-8 flex flex-col items-center justify-center text-center h-full">
            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 mb-6 relative group cursor-pointer">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                {/* Mock QR Code Pattern */}
                <div className="grid grid-cols-5 gap-1 p-2 opacity-80">
                  {[...Array(25)].map((_, i) => (
                    <div key={i} className={`w-3 h-3 ${Math.random() > 0.4 ? 'bg-slate-900' : 'bg-slate-100'} rounded-[2px]`}></div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-slate-900 font-bold text-lg leading-none mb-1 tracking-tight">NFC-991203</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Encrypted Auth Token</p>

            <div className="mt-8 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Secure Connection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Actions Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
            <Settings size={28} />
          </div>
          <div>
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">System Preferences</h3>
            <p className="text-slate-500 font-medium text-sm">Configure your experience and notifications</p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={handleLogout}
            className="flex-1 md:flex-none px-8 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 group border border-red-100 active:scale-95"
          >
            Sign Out <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
