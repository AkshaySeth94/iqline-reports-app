'use client';

import { useState, FormEvent, useContext } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { AuthContext } from '@/contexts/AuthContext';

type FormType = 'patient' | 'admin';

export default function LoginPage() {
  const [formType, setFormType] = useState<FormType>('patient');

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">LD</span>
          <div>
            <div style={{ fontWeight: 600, letterSpacing: '-0.01em' }}>LabDash</div>
            <div className="text-sm muted">Your lab reports, simplified</div>
          </div>
        </div>

        <h1 className="auth-heading">Sign in to LabDash</h1>
        <p className="auth-sub">Choose how you&apos;d like to continue.</p>

        <div
          className="segmented"
          role="tablist"
          aria-label="Login type"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <button
            type="button"
            role="tab"
            aria-pressed={formType === 'patient'}
            className="segmented-btn"
            onClick={() => setFormType('patient')}
          >
            Patient
          </button>
          <button
            type="button"
            role="tab"
            aria-pressed={formType === 'admin'}
            className="segmented-btn"
            onClick={() => setFormType('admin')}
          >
            Admin
          </button>
        </div>

        {formType === 'patient' ? <PatientLoginForm /> : <AdminLoginForm />}
      </div>
    </main>
  );
}

function PatientLoginForm() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useContext(AuthContext);

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.patientLogin(phone);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP request.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await api.verifyOtp(phone, otp);
      auth?.login(accessToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} className="stack stack-4">
        <div className="field">
          <label className="field-label" htmlFor="patient-phone">Phone number</label>
          <input
            id="patient-phone"
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            pattern="\d{10}"
            placeholder="10-digit phone number"
            inputMode="numeric"
            autoComplete="tel"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Sending OTP…' : 'Send OTP'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleOtpSubmit} className="stack stack-4">
      <div className="field">
        <label className="field-label" htmlFor="patient-otp">One-time passcode</label>
        <input
          id="patient-otp"
          className="input"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          pattern="\d{6}"
          placeholder="6-digit OTP"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
        />
        <span className="field-hint">Sent to {phone}</span>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Verifying…' : 'Verify & sign in'}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={() => {
          setStep('phone');
          setOtp('');
          setError('');
        }}
      >
        Use a different number
      </button>
      <div className="auth-hint">
        Demo OTP: <code>123456</code>
      </div>
    </form>
  );
}

function AdminLoginForm() {
  const [phone, setPhone] = useState('9999942496');
  const [password, setPassword] = useState('Hello@123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useContext(AuthContext);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken } = await api.adminLogin(phone, password);
      auth?.login(accessToken);
      router.push('/panel');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stack stack-4">
      <div className="field">
        <label className="field-label" htmlFor="admin-phone">Phone number</label>
        <input
          id="admin-phone"
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="username"
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
