import { User, Mail, Bell, Key, Globe, Layout, LogOut } from 'lucide-react';
import { useAuth } from '../../AuthContext';

export default function SettingsPage() {
    const { user, logout } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1">Manage your account preferences and security settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Navigation */}
                <div className="space-y-2">
                    {[
                        { icon: User, label: 'Profile' },
                        { icon: Bell, label: 'Notifications' },
                        { icon: Key, label: 'Security' },
                        { icon: Layout, label: 'Appearance' },
                        { icon: Globe, label: 'Language' },
                    ].map((item, idx) => (
                        <button
                            key={idx}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium ${idx === 0 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                    <div className="pt-4 mt-4 border-t border-slate-200">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-medium"
                        >
                            <LogOut size={20} />
                            Log Out
                        </button>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold shadow-inner">
                                {user?.first_name?.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">{user?.first_name} {user?.last_name}</h3>
                                <p className="text-slate-500 font-medium capitalize">{user?.role} Account</p>
                                <button className="mt-2 text-primary text-sm font-bold hover:underline">Change Avatar</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">First Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                                    defaultValue={user?.first_name}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Last Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                                    defaultValue={user?.last_name || ''}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium opacity-70 cursor-not-allowed"
                                        defaultValue={user?.username || 'instructor@campus.edu'}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                                Save Profile Changes
                            </button>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
                        <h3 className="text-xl font-bold text-slate-900">Notifications</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Session Reminders', desc: 'Get notified 15 minutes before a class starts' },
                                { label: 'Attendance Summaries', desc: 'Daily reports of students marked as late or absent' },
                                { label: 'System Announcements', desc: 'Important campus-wide news and updates' }
                            ].map((pref, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 leading-tight">{pref.label}</p>
                                        <p className="text-xs text-slate-500 mt-1">{pref.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked={idx === 2} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
