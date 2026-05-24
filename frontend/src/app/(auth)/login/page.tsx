'use client';

import { useState, FormEvent, useContext } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { AuthContext } from '@/contexts/AuthContext';

type FormType = 'patient' | 'admin';

export default function LoginPage() {
  const [formType, setFormType] = useState<FormType>('patient');

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <div>
        <button onClick={() => setFormType('patient')}>Patient Login</button>
        <button onClick={() => setFormType('admin')}>Admin Login</button>
      </div>
      <hr style={{ margin: '20px 0' }} />
      {formType === 'patient' ? <PatientLoginForm /> : <AdminLoginForm />}
    </div>
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
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP request.');
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
    } catch (err: any) {
      setError(err.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Patient Login</h2>
      {step === 'phone' ? (
        <form onSubmit={handlePhoneSubmit}>
          <div>
            <label>Phone Number:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              pattern="\d{10}"
              placeholder="10-digit phone number"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Get OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit}>
          <p>Enter OTP for {phone}. (Hint: it&apos;s 123456)</p>
          <div>
            <label>OTP:</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              pattern="\d{6}"
              placeholder="6-digit OTP"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
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
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Phone Number:</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
