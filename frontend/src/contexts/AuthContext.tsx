'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { DecodedToken, User, UserRole } from '@/types';
import * as api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
  forcePasswordChange: boolean;
  setForcePasswordChange: (v: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const decodeToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChangeState] = useState(false);

  const setForcePasswordChange = useCallback((v: boolean) => {
    setForcePasswordChangeState(v);
    if (typeof window !== 'undefined') {
      if (v) localStorage.setItem('forcePasswordChange', '1');
      else localStorage.removeItem('forcePasswordChange');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setForcePasswordChangeState(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('forcePasswordChange');
    }
    api.setAuthToken(null);
  }, []);

  const login = useCallback(
    (newToken: string) => {
      const decoded = decodeToken(newToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', newToken);
        }
        setToken(newToken);
        api.setAuthToken(newToken);
        setUser({
          _id: decoded.sub,
          phone: decoded.phone,
          role: decoded.role as UserRole,
          name: decoded.name,
          labId: decoded.labId ?? null,
        });
      } else {
        logout();
      }
    },
    [logout],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('authToken');
    if (stored) login(stored);
    const fp = localStorage.getItem('forcePasswordChange');
    if (fp === '1') setForcePasswordChangeState(true);
    setIsLoading(false);
  }, [login]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        isLoading,
        forcePasswordChange,
        setForcePasswordChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
