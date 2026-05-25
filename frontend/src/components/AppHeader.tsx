'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthContext } from '@/contexts/AuthContext';

interface AppHeaderProps {
  tag: string;
}

export default function AppHeader({ tag }: AppHeaderProps) {
  const auth = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = () => {
    auth?.logout();
    router.push('/login');
  };

  const user = auth?.user;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">LD</span>
          <span>LabDash</span>
          <span className="brand-tag">{tag}</span>
        </Link>
        <nav className="app-nav">
          {user && (
            <span className="user-pill" aria-label="Current user">
              <strong>{user.name || user.phone}</strong>
              <span aria-hidden="true">·</span>
              <span>{user.role}</span>
            </span>
          )}
          {auth?.isAuthenticated && (
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
