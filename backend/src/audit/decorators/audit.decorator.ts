import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit:action';
export const AUDIT_READ_KEY = 'audit:read-action';

/** Mark controller method as audit-required (writes/sensitive ops). */
export const Audit = (action: string) => SetMetadata(AUDIT_KEY, action);

/** Mark controller method as audit-required for sensitive reads. */
export const AuditRead = (action: string) => SetMetadata(AUDIT_READ_KEY, action);
