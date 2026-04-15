/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { UserProfile } from './api';

interface AuthCtx {
  user: UserProfile | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<UserProfile | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (token) {
      api.profile().then(setUser).catch(() => logout());
    }
  }, [token, logout]);

  const login = async (username: string, password: string) => {
    const tokens = await api.login(username, password);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setToken(tokens.access_token);
  };

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
