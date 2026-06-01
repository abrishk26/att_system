/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { api, tryRefreshSession } from './api';
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initStarted = useRef(false);

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
    if (initStarted.current) return;
    initStarted.current = true;

    async function initAuth() {
      const storedAccess = localStorage.getItem('access_token');
      const storedRefresh = localStorage.getItem('refresh_token');

      if (!storedAccess && !storedRefresh) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Rotate tokens before protected calls when a refresh token exists
        if (storedRefresh) {
          const fresh = await tryRefreshSession();
          if (fresh) {
            setToken(fresh);
          } else if (!storedAccess) {
            logout();
            return;
          }
        }

        const verify = await api.verify();
        const profile = await api.profile();

        if (profile.role !== verify.role) {
          console.error('Role mismatch between token and profile. Logging out.', {
            tokenRole: verify.role,
            profileRole: profile.role,
          });
          logout();
          return;
        }

        setUser(profile);
        setToken(localStorage.getItem('access_token'));
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // One more refresh attempt if verify/profile failed with expired access token
        const recovered = await tryRefreshSession();
        if (recovered) {
          try {
            const verify = await api.verify();
            const profile = await api.profile();
            if (profile.role === verify.role) {
              setUser(profile);
              setToken(recovered);
              return;
            }
          } catch {
            /* fall through to logout */
          }
        }
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    void initAuth();
  }, [logout]);

  const login = async (username: string, password: string) => {
    const tokens = await api.login(username, password);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setToken(tokens.access_token);
    const profile = await api.profile();
    setUser(profile);
    return tokens;
  };

  return <Ctx.Provider value={{ user, token, login, logout, isLoading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
