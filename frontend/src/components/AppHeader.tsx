'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthContext } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import type { Lab } from '@/types';

interface AppHeaderProps {
  tag: string;
  /** Fetch + display the current LabAdmin's lab name + suspended badge. */
  showLabName?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Platform Admin',
  LabAdmin: 'Lab Admin',
  Admin: 'Lab Admin',
  Patient: 'Patient',
};

export default function AppHeader({ tag, showLabName = false }: AppHeaderProps) {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [lab, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    if (!showLabName || !auth?.user?.labId) return;
    let cancelled = false;
    api
      .getMyLab()
      .then((l) => {
        if (!cancelled) setLab(l);
      })
      .catch(() => {
        // Header degrades gracefully if the call fails
      });
    return () => {
      cancelled = true;
    };
  }, [showLabName, auth?.user?.labId]);

  const handleLogout = () => {
    auth?.logout();
    router.push('/login');
  };

  const user = auth?.user;
  const truncatedLab =
    lab?.name && lab.name.length > 24 ? lab.name.slice(0, 23) + '…' : lab?.name;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">LD</span>
          <span>LabDash</span>
          <span className="brand-tag">{tag}</span>
        </Link>
        <nav className="app-nav">
          {showLabName && truncatedLab && (
            <span className="user-pill" title={lab?.name || undefined}>
              <strong>{truncatedLab}</strong>
              {lab?.status === 'Suspended' && (
                <span
                  className="badge badge-error ml-2"
                  title="Contact platform admin"
                >
                  Suspended
                </span>
              )}
            </span>
          )}
          {user && (
            <span className="user-pill" aria-label="Current user">
              <strong>{user.name || user.phone}</strong>
              <span aria-hidden="true">·</span>
              <span>{ROLE_LABELS[user.role] || user.role}</span>
            </span>
          )}
          {auth?.isAuthenticated && (
            <Link href="/change-password" className="btn btn-ghost">
              Change password
            </Link>
          )}
          {auth?.isAuthenticated && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
