import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { LoginShell } from '@/components/auth/LoginShell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function InstructorLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginShell
      portalLabel="Instructor"
      title="Instructor portal"
      description="Manage classes, sessions, and attendance from one workspace."
      icon={<UserCheck size={36} />}
      accentClass="bg-gradient-to-br from-emerald-500 to-teal-600"
      submitLabel="Access portal"
      error={error}
      isLoading={isLoading}
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="instructor-username">Username</Label>
        <div className="relative">
          <UserCheck
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="instructor-username"
            type="text"
            required
            placeholder="Enter your username"
            className="h-12 pl-10 text-base"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructor-password">Password</Label>
        <div className="relative">
          <Lock
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="instructor-password"
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
