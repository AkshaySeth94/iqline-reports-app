'use client';

import { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';

interface UseAuthOptions {
  required?: boolean;
  role?: 'Admin' | 'Patient';
}

export function useAuth(options: UseAuthOptions = {}) {
  const context = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, isAuthenticated, isLoading } = context;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isAuthPage = pathname === '/login';

    if (options.required && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && isAuthPage) {
      router.push(user?.role === 'Admin' ? '/panel' : '/dashboard');
      return;
    }

    if (options.role && user?.role !== options.role) {
      // Redirect to their own dashboard if they land on the wrong page
      router.push(user?.role === 'Admin' ? '/panel' : '/dashboard');
    }
  }, [
    user,
    isAuthenticated,
    isLoading,
    options.required,
    options.role,
    router,
    pathname,
  ]);

  return context;
}
