'use client';

import { FormEvent, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { AuthContext } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

const HOME_BY_ROLE: Record<UserRole, string> = {
  SuperAdmin: '/super',
  LabAdmin: '/panel',
  Admin: '/panel',
  Patient: '/dashboard',
};

export default function ChangePasswordPage() {
  // Require auth — anyone with a session can self-service.
  const auth = useContext(AuthContext);
  useAuth({ required: true });
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const forced = !!auth?.forcePasswordChange;

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (next !== confirm) {
      setErr('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(next, forced ? undefined : current);
      auth?.setForcePasswordChange(false);
      router.push(auth?.user ? HOME_BY_ROLE[auth.user.role] : '/');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">
          {forced ? 'Set your password' : 'Change password'}
        </h1>
        <p className="auth-sub">
          {forced
            ? 'You must set a new password before continuing.'
            : 'Minimum 10 characters, with at least one letter and one digit.'}
        </p>
        <form onSubmit={handle} className="stack stack-4 mt-4">
          {!forced && (
            <div className="field">
              <label className="field-label" htmlFor="cp-current">Current password</label>
              <input
                id="cp-current"
                className="input"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="cp-new">New password</label>
            <input
              id="cp-new"
              className="input"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
              autoFocus={forced}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="cp-confirm">Confirm new password</label>
            <input
              id="cp-confirm"
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
          </div>
          {err && <div className="alert alert-error">{err}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </main>
  );
}
