import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import {
    UserCheck,
    Lock,
    ArrowLeft,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff,
    Sun,
    Moon,
} from 'lucide-react';

export default function InstructorLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useDarkMode();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await login(username, password);
            if (result.role !== 'instructor' && result.role !== 'admin') {
                logout();
                throw new Error('Access denied: You do not have instructor permissions.');
            }
            navigate('/instructor/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-black relative overflow-hidden transition-colors duration-300">
            {/* Theme toggle */}
            <button
                onClick={() => setIsDark(!isDark)}
                className="absolute top-5 right-5 p-2.5 rounded-xl text-slate-400 dark:text-neutral-500 hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* Abstract background blobs */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-600/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400/10 dark:bg-teal-600/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md animate-fade-in-up">
                {/* Back button */}
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center text-slate-400 dark:text-neutral-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors mb-8 font-medium text-sm"
                >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Landing Page
                </button>

                {/* Card */}
                <div className="p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-colors duration-300">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 shadow-sm">
                            <UserCheck size={32} />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Instructor Login</h1>
                        <p className="text-slate-500 dark:text-neutral-400 text-sm">Sign in to manage your classes and attendance.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex items-start text-red-600 dark:text-red-400 text-sm animate-fade-in">
                                <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-neutral-300 ml-1">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-neutral-500">
                                    <UserCheck size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-neutral-300 ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-neutral-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-emerald-400 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 dark:text-neutral-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center text-sm">
                            <label className="flex items-center text-slate-600 dark:text-neutral-400 cursor-pointer gap-2">
                                <input type="checkbox" className="rounded border-slate-300 dark:border-neutral-600 text-emerald-500 focus:ring-emerald-500 bg-white dark:bg-neutral-800" />
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <span>Access Portal</span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
