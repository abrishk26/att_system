import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Login failed');
      }

      const data = (await response.json()) as LoginResponse;
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      navigate('/student/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--aau-border)] bg-white shadow-[var(--aau-shadow-strong)]">
        <div className="bg-[var(--aau-primary)] px-7 py-6 text-white">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">Addis Ababa University</p>
          <h1 className="mt-1 text-2xl font-bold">CNCS Smart Attendance</h1>
          <p className="mt-1 text-sm text-white/80">School of Information Science Student Portal</p>
        </div>

        <div className="p-6 md:p-8">
          <h2 className="text-xl font-semibold text-[var(--aau-text)]">Sign In</h2>
          <p className="mt-1 text-sm text-[var(--aau-muted)]">Use your account from the data-source service.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--aau-text)]">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-[var(--aau-border)] bg-white px-3 py-2.5 text-[var(--aau-text)] placeholder:text-gray-400 focus:border-[var(--aau-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,168,232,0.25)]"
                placeholder="ava.martin"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--aau-text)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--aau-border)] bg-white px-3 py-2.5 text-[var(--aau-text)] placeholder:text-gray-400 focus:border-[var(--aau-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,168,232,0.25)]"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
