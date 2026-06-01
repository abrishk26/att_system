import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, UserCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { LoginShell } from '@/components/auth/LoginShell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginShell
      portalLabel="Administrator"
      title="Admin portal"
      description="Sign in to the Digital Attendance management console."
      icon={<ShieldCheck size={36} />}
      accentClass="bg-gradient-to-br from-indigo-500 to-violet-600"
      submitLabel="Sign in to dashboard"
      loadingLabel="Verifying…"
      error={error}
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="admin-username" className="text-sm font-medium">
          Username
        </Label>
        <div className="relative">
          <UserCircle
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="admin-username"
            type="text"
            autoFocus
            required
            placeholder="Enter your username"
            className="h-12 pl-10 text-base"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="••••••••"
            className="h-12 pl-10 pr-12 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
      </div>
    </LoginShell>
  );
}
