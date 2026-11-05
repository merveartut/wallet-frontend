import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '../api/client';
import { walletApi } from '../api/walletApi';
import { decodeToken, isExpired, type TokenClaims } from './jwt';
import { tokenStorage } from './tokenStorage';

export interface SessionUser {
  id: number;
  username: string;
  role: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  /** Oturumun neden kapandığı (giriş sayfasında gösterilir) */
  logoutReason: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredClaims(): TokenClaims | null {
  const token = tokenStorage.get();
  const claims = token ? decodeToken(token) : null;
  if (!claims || isExpired(claims)) {
    tokenStorage.clear();
    return null;
  }
  return claims;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<TokenClaims | null>(loadStoredClaims);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const logout = useCallback((reason?: string) => {
    tokenStorage.clear();
    setClaims(null);
    setLogoutReason(reason ?? null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const token = (await walletApi.login(username, password)).trim();
    const newClaims = decodeToken(token);
    if (!newClaims) {
      throw new Error('Sunucudan geçersiz bir oturum bilgisi geldi.');
    }
    tokenStorage.set(token);
    setLogoutReason(null);
    setClaims(newClaims);
  }, []);

  // Oturumlu bir istek 401 alırsa oturumu kapat
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Token süresi dolduğunda (30 dk) oturumu kendiliğinden kapat
  useEffect(() => {
    if (!claims) return;
    const remainingMs = claims.exp * 1000 - Date.now();
    const timer = window.setTimeout(
      () => logout('Oturum süreniz doldu. Lütfen tekrar giriş yapın.'),
      Math.max(remainingMs, 0),
    );
    return () => window.clearTimeout(timer);
  }, [claims, logout]);

  const value = useMemo<AuthContextValue>(() => {
    const user = claims ? { id: claims.userId, username: claims.sub, role: claims.role } : null;
    return { user, isAdmin: user?.role === 'ADMIN', logoutReason, login, logout };
  }, [claims, logoutReason, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  }
  return context;
}
