/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { api, tryRefreshSession } from './api';
import type { UserProfile } from './api';
import {
  type AuthPortal,
  clearLegacyAuthKeys,
  clearSession,
  getRefreshToken,
  getSession,
  portalFromPath,
  roleAllowedForPortal,
  sessionStorageKey,
  setActivePortal,
  setSession,
  updateSessionTokens,
} from './lib/authStorage';

interface AuthCtx {
  user: UserProfile | null;
  token: string | null;
  portal: AuthPortal | null;
  login: (
    username: string,
    password: string,
    portal?: AuthPortal,
  ) => Promise<{ access_token: string; refresh_token: string; role: string }>;
  logout: () => void;
  isLoading: boolean;
}

const Ctx = createContext<AuthCtx>(null!);

clearLegacyAuthKeys();

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const portal = useMemo(() => portalFromPath(location.pathname), [location.pathname]);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    if (portal) {
      const refresh = getRefreshToken(portal);
      if (refresh) {
        void api.logout(refresh).catch(() => {});
      }
      clearSession(portal);
    }
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, [portal]);

  useEffect(() => {
    api.setOnTokenUpdate((newToken) => {
      if (!portal) return;
      if (newToken) {
        const session = getSession(portal);
        if (session) {
          updateSessionTokens(portal, newToken, session.refresh_token, session.role);
        }
        setToken(newToken);
      } else {
        clearSession(portal);
        setToken(null);
        setUser(null);
        setIsLoading(false);
      }
    });
  }, [logout, portal]);

  const loadPortalSession = useCallback(async () => {
    setActivePortal(portal);

    if (!portal) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    const session = getSession(portal);
    if (!session) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setToken(session.access_token);

    try {
      if (session.refresh_token) {
        const fresh = await tryRefreshSession(portal);
        if (fresh) {
          setToken(fresh);
        }
      }

      const verify = await api.verify();
      const profile = await api.profile();

      if (profile.role !== verify.role) {
        console.error('Role mismatch between token and profile. Clearing portal session.', {
          portal,
          tokenRole: verify.role,
          profileRole: profile.role,
        });
        clearSession(portal);
        setToken(null);
        setUser(null);
        return;
      }

      if (!roleAllowedForPortal(profile.role, portal)) {
        console.warn('User role not allowed for this portal. Clearing portal session.', {
          portal,
          role: profile.role,
        });
        clearSession(portal);
        setToken(null);
        setUser(null);
        return;
      }

      const updated = getSession(portal);
      setUser(profile);
      setToken(updated?.access_token ?? session.access_token);
      if (updated) {
        setSession(portal, { ...updated, role: profile.role });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      const recovered = await tryRefreshSession(portal);
      if (recovered) {
        try {
          const verify = await api.verify();
          const profile = await api.profile();
          if (
            profile.role === verify.role &&
            roleAllowedForPortal(profile.role, portal)
          ) {
            setUser(profile);
            setToken(recovered);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      clearSession(portal);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    void loadPortalSession();
  }, [loadPortalSession]);

  // Sync when another tab updates this portal's session
  useEffect(() => {
    if (!portal) return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== sessionStorageKey(portal)) return;
      void loadPortalSession();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [portal, loadPortalSession]);

  const login = async (
    username: string,
    password: string,
    loginPortal?: AuthPortal,
  ) => {
    const targetPortal = loginPortal ?? portal;
    if (!targetPortal) {
      throw new Error('Cannot log in outside a portal route.');
    }

    setActivePortal(targetPortal);
    const tokens = await api.login(username, password);

    if (!roleAllowedForPortal(tokens.role, targetPortal)) {
      throw new Error('Access denied for this portal.');
    }

    setSession(targetPortal, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      role: tokens.role,
    });
    setToken(tokens.access_token);

    const profile = await api.profile();
    if (!roleAllowedForPortal(profile.role, targetPortal)) {
      clearSession(targetPortal);
      setToken(null);
      setUser(null);
      throw new Error('Access denied for this portal.');
    }

    setUser(profile);
    return tokens;
  };

  return (
    <Ctx.Provider value={{ user, token, portal, login, logout, isLoading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
