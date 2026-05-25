import { Report, User } from '@/types';

const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is not defined in environment variables.',
    );
  }
  return url;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}/api/v1${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message || 'An API error occurred',
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Auth
export const adminLogin = (phone: string, password: string) =>
  request<{ accessToken: string }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });

export const patientLogin = (phone: string) =>
  request<{ message: string }>('/auth/patient/login', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

export const verifyOtp = (phone: string, otp: string) =>
  request<{ accessToken: string }>('/auth/patient/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });

// Reports
export const getReports = () => request<Report[]>('/reports');

export const createReport = (data: {
  patient: string;
  reportDate: Date;
  status: 'Final' | 'Corrected';
  reportType: 'GlucoseMarker';
  data: { glucoseValue: number };
  notes?: string;
}) =>
  request<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Users
export const createPatient = (data: { name: string; phone: string }) =>
  request<User>('/users/patient', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getPatients = () => request<User[]>('/users/patients');
