import type {
  AggregatedReport,
  AuditEntry,
  EntityStatus,
  Lab,
  LabAdmin,
  PatientListItem,
  PatientSearchResult,
  Report,
  User,
} from '@/types';

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

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBaseUrl()}/api/v1${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let body: any = null;
    try { body = await response.json(); } catch { /* ignore */ }
    const msg = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || response.statusText;
    throw new ApiError(msg, response.status, body);
  }
  if (response.status === 204) return null as T;
  return response.json();
}

// ---- Auth: phone + password login. ----
export const login = (phone: string, password: string) =>
  request<{ accessToken: string; role: string; forcePasswordChange: boolean }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ phone, password }) },
  );

/** Authenticated self-service password change. */
export const changePassword = (newPassword: string, currentPassword?: string) =>
  request<{ ok: true }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, currentPassword }),
  });

export const ackTerms = () =>
  request<{ ok: true }>('/auth/patient/terms-acknowledged', {
    method: 'POST', body: JSON.stringify({}),
  });

export const me = () => request<{
  userId: string;
  role: string;
  labId: string | null;
  phone: string;
  name: string;
}>('/auth/me');

// ---- SuperAdmin: Labs ----
export const listLabs = (params: { search?: string; cursor?: string; limit?: number } = {}) => {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return request<{ items: Lab[]; nextCursor: string | null }>(`/labs${qs ? '?' + qs : ''}`);
};

export const createLab = (dto: Partial<Lab>) =>
  request<Lab>('/labs', { method: 'POST', body: JSON.stringify(dto) });

/** LabAdmin self-read of their own lab profile. */
export const getMyLab = () => request<Lab>('/labs/mine');

export const getLabDetail = (id: string) =>
  request<Lab & { counts: { reportsLast7: number; reportsLast30: number; patientCount: number; weeklyReports: any[] } }>(`/labs/${id}`);

export const updateLab = (id: string, dto: Partial<Lab>) =>
  request<Lab>(`/labs/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const setLabStatus = (id: string, status: EntityStatus) =>
  request<Lab>(`/labs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ---- SuperAdmin: LabAdmins ----
export const listLabAdmins = (labId: string) =>
  request<LabAdmin[]>(`/lab-admins/labs/${labId}`);

export const createLabAdmin = (
  labId: string,
  dto: { name: string; phone: string; temporaryPassword: string },
) =>
  request<LabAdmin>(`/lab-admins/labs/${labId}`, { method: 'POST', body: JSON.stringify(dto) });

export const setLabAdminStatus = (id: string, status: EntityStatus) =>
  request<LabAdmin>(`/lab-admins/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ---- SuperAdmin: Metrics ----
export const getMetricsTiles = () =>
  request<{
    activeLabs: number;
    activePatients: number;
    reportsLast7Days: number;
    reportsLast30Days: number;
  }>('/super-admin/metrics/tiles');

// ---- SuperAdmin: Audit ----
export const searchAudit = (params: {
  actorId?: string; labId?: string; action?: string;
  from?: string; to?: string; cursor?: string; limit?: number;
}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const qs = q.toString();
  return request<{ items: AuditEntry[]; nextCursor: string | null }>(
    `/audit/search${qs ? '?' + qs : ''}`,
  );
};

// ---- LabAdmin: Patients ----
export const searchPatient = (phone: string) =>
  request<PatientSearchResult>(`/patients/search?phone=${encodeURIComponent(phone)}`);

export const listLabPatients = (params: { search?: string; cursor?: string; limit?: number } = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const qs = q.toString();
  return request<{ items: PatientListItem[]; nextCursor: string | null }>(
    `/patients/lab${qs ? '?' + qs : ''}`,
  );
};

export const linkPatient = (patientId: string) =>
  request<{ ok: true; link: any }>(`/patients/${patientId}/link`, { method: 'POST', body: JSON.stringify({}) });

export const addAndLinkPatient = (dto: {
  name: string;
  phone: string;
  dateOfBirth: string;
  temporaryPassword: string;
}) =>
  request<{ patient: User; isFirstLinkForLab: boolean }>(`/patients`, {
    method: 'POST', body: JSON.stringify(dto),
  });

export const getMatchSummary = (patientId: string) =>
  request<{ _id: string; name: string; dateOfBirth?: string | null } | null>(
    `/patients/${patientId}/match-summary`,
  );

export const getPatientDetail = (id: string) =>
  request<{ _id: string; name: string; phone: string; dateOfBirth?: string | null; visitingSince: string }>(
    `/patients/${id}`,
  );

// ---- Reports ----
export const listReportsForPatientThisLab = (patientId: string) =>
  request<Report[]>(`/reports?patientId=${patientId}`);

export const createReport = (dto: {
  patient: string;
  reportDate: string;
  glucoseValue: number;
  unit?: 'mg/dL' | 'mmol/L';
  mealContext?: 'Fasting' | 'PostMeal' | 'Random';
  status?: 'Final' | 'Corrected';
  notes?: string;
}) => request<Report>('/reports', { method: 'POST', body: JSON.stringify(dto) });

export const updateReport = (id: string, dto: Partial<{
  glucoseValue: number; unit: string; mealContext: string; status: string; notes: string;
}>) => request<Report>(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const deleteReport = (id: string, reason?: string) =>
  request<void>(`/reports/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });

// ---- Patient: aggregated reports ----
export const getMyReports = () => request<AggregatedReport[]>('/reports/me');
