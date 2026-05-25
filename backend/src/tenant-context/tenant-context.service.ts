import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { MetricsService } from '../common/metrics/metrics.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantScopeViolation } from './tenant-scope-violation.error';

interface TenantState {
  userId: string | null;
  role: UserRole | null;
  labId: string | null;
  isCrossTenantRead: boolean;
}

/**
 * Singleton tenant context backed by AsyncLocalStorage. The per-request
 * state is stored in an ALS store created by RequestContextMiddleware
 * once per request, so we don't need NestJS request-scope (which has
 * known DI-cascade issues with APP_INTERCEPTOR / APP_GUARD registration).
 */
@Injectable()
export class TenantContext {
  // Exposed so middleware can call `.run(state, () => next())`.
  readonly als = new AsyncLocalStorage<TenantState>();

  constructor(private readonly metrics: MetricsService) {}

  /** Convenience: get the current store, or null if outside a request. */
  private store(): TenantState | null {
    return this.als.getStore() ?? null;
  }

  populate(args: { userId: string; role: UserRole; labId: string | null }) {
    const s = this.store();
    if (!s) return; // outside a request — bootstrap/migrations/etc
    s.userId = args.userId;
    s.role = args.role;
    s.labId = args.labId;
  }

  get userId(): string | null { return this.store()?.userId ?? null; }
  get role(): UserRole | null { return this.store()?.role ?? null; }
  get labId(): string | null { return this.store()?.labId ?? null; }
  get isCrossTenantRead(): boolean { return this.store()?.isCrossTenantRead ?? false; }
  set isCrossTenantRead(v: boolean) {
    const s = this.store();
    if (s) s.isCrossTenantRead = v;
  }

  /**
   * Per-method assertion. Throws (and emits P0 metric) if any document's
   * labId doesn't match the current tenant. SuperAdmin bypasses.
   */
  assertLabIdOf(
    documents:
      | ReadonlyArray<{ labId?: { toString(): string } | null }>
      | { labId?: { toString(): string } | null }
      | null
      | undefined,
    resource = 'unknown',
  ): void {
    if (!documents) return;
    if (this.role === UserRole.SuperAdmin) return;
    const expected = this.labId;
    if (!expected) {
      this.metrics.increment('tenant-scope-assertion.failure', {
        resource,
        reason: 'no-tenant',
      });
      throw new InternalServerErrorException('Tenant scope unavailable');
    }
    const docs = Array.isArray(documents) ? documents : [documents];
    for (const d of docs) {
      const docLabId = d?.labId?.toString?.() ?? null;
      if (docLabId !== expected) {
        this.metrics.increment('tenant-scope-assertion.failure', {
          resource,
          expected,
          actual: docLabId || 'null',
        });
        throw new TenantScopeViolation(expected, docLabId, resource);
      }
    }
  }
}
