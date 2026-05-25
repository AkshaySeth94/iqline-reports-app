export type UserRole = 'SuperAdmin' | 'LabAdmin' | 'Admin' | 'Patient';
export type EntityStatus = 'Active' | 'Suspended' | 'Disabled';
export type MealContext = 'Fasting' | 'PostMeal' | 'Random';
export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type ReportStatus = 'Final' | 'Corrected';

export interface User {
  _id: string;
  name: string;
  phone: string;
  role: UserRole;
  labId?: string | null;
}

export interface DecodedToken {
  v?: number;
  exp: number;
  iat: number;
  name: string;
  phone: string;
  role: UserRole;
  sub: string;
  labId?: string | null;
}

export interface Lab {
  _id: string;
  name: string;
  licenseNumber: string;
  status: EntityStatus;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  isMigrationDefault?: boolean;
  reportCount?: number;
  patientCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabAdmin {
  _id: string;
  name: string;
  phone: string;
  status: EntityStatus;
  lastLoginAt?: string | null;
  forcePasswordChange?: boolean;
}

export interface Report {
  _id: string;
  patient: string;
  labId?: string;
  reportDate: string;
  status: ReportStatus;
  notes?: string;
  reportType: string;
  data: { glucoseValue: number };
  mealContext: MealContext;
  unit: GlucoseUnit;
  createdAt: string;
  updatedAt: string;
}

/** Patient-aggregated report includes joined lab metadata. */
export interface AggregatedReport extends Report {
  lab: {
    _id: string;
    name: string;
    licenseNumber: string;
    status: EntityStatus;
  } | null;
}

export interface PatientListItem {
  patientId: string;
  labId: string;
  linkId: string;
  name: string;
  phone: string;
  dateOfBirth?: string | null;
  linkedAt: string;
}

export interface PatientSearchResult {
  status: 'in-lab' | 'cross-lab' | 'not-found';
  patient?: {
    _id: string;
    name: string;
    phone: string;
    dateOfBirth?: string | null;
  };
}

export interface AuditEntry {
  _id: string;
  actorId: string;
  actorRole?: UserRole;
  labId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  /** Joined from users collection by the backend (null for non-User actors like "system"). */
  actor?: {
    _id: string;
    name: string;
    role: UserRole;
    phone?: string;
  } | null;
  /** Joined from labs collection (null when labId is null, e.g. platform-level events). */
  lab?: {
    _id: string;
    name: string;
    licenseNumber: string;
  } | null;
}
