'use client';

import { useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthContext } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface UseAuthOptions {
  required?: boolean;
  role?: UserRole | UserRole[];
}

const HOME_BY_ROLE: Record<UserRole, string> = {
  SuperAdmin: '/super',
  LabAdmin: '/panel',
  Admin: '/panel',
  Patient: '/dashboard',
};

export function useAuth(options: UseAuthOptions = {}) {
  const context = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, isAuthenticated, isLoading, forcePasswordChange } = context;

  useEffect(() => {
    if (isLoading) return;
    const isLoginPath = pathname.startsWith('/login');
    const isChangePasswordPath = pathname === '/change-password';

    if (options.required && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && isLoginPath) {
      router.push(user ? HOME_BY_ROLE[user.role] : '/login');
      return;
    }

    // Hard-redirect users with a temp password to the change-password page.
    if (
      isAuthenticated &&
      forcePasswordChange &&
      !isChangePasswordPath
    ) {
      router.push('/change-password');
      return;
    }

    const allowed = Array.isArray(options.role)
      ? options.role
      : options.role
      ? [options.role]
      : null;

    if (allowed && user && !allowed.includes(user.role)) {
      router.push(HOME_BY_ROLE[user.role]);
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
