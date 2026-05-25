'use client';

import { FormEvent, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { AuthContext } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

const HOME_BY_ROLE: Record<UserRole, string> = {
  SuperAdmin: '/super',
  LabAdmin: '/panel',
  Admin: '/panel',
  Patient: '/dashboard',
};

/**
 * Phone + password login. The backend resolves the caller's role from the
 * phone alone — after verify we route to the home page that matches the
 * token's role. If the user was admin-seeded with a temp password the
 * backend returns forcePasswordChange=true and we route to /change-password.
 */
export default function PasswordLoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const router = useRouter();

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { accessToken, role, forcePasswordChange } = await api.login(phone, password);
      auth?.login(accessToken);
      if (forcePasswordChange) {
        auth?.setForcePasswordChange?.(true);
        router.push('/change-password');
      } else {
        router.push(HOME_BY_ROLE[role as UserRole] || '/');
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle} className="stack stack-4">
      <div className="field">
        <label className="field-label" htmlFor="login-phone">Phone number</label>
        <input
          id="login-phone"
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="10-digit phone number"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
