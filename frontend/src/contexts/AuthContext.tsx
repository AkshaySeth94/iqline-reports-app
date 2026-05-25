'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { DecodedToken, User } from '@/types';
import * as api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const decodeToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Invalid token:', e);
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    api.setAuthToken(null);
  }, []);

  const login = useCallback(
    (newToken: string) => {
      const decoded = decodeToken(newToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        api.setAuthToken(newToken);
        setUser({
          _id: decoded.sub,
          phone: decoded.phone,
          role: decoded.role,
          name: decoded.name,
        });
      } else {
        logout();
      }
    },
    [logout],
  );

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      login(storedToken);
    }
    setIsLoading(false);
  }, [login]);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
