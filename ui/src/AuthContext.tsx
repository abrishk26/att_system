/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { UserProfile } from './api';

interface AuthCtx {
  user: UserProfile | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ access_token: string; refresh_token: string; role: string }>;
  logout: () => void;
  isLoading: boolean;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    api.setOnTokenUpdate((newToken) => {
      if (newToken) {
        setToken(newToken);
      } else {
        logout();
      }
    });
  }, [logout]);

  useEffect(() => {
    async function initAuth() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Verify token identity and role
        const { role } = await api.verify();
        
        // 2. Fetch full profile
        const profile = await api.profile();
        
        // 3. Force consistency check
        if (profile.role !== role) {
          console.error('Role mismatch detected between token and profile. Logging out for security.', { tokenRole: role, profileRole: profile.role });
          logout();
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, [token, logout]);

  const login = async (username: string, password: string) => {
    const tokens = await api.login(username, password);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setToken(tokens.access_token);
    return tokens;
  };

  return <Ctx.Provider value={{ user, token, login, logout, isLoading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
