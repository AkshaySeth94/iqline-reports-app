import { Injectable } from '@nestjs/common';
import { AuditWriteQueueService, AuditEntryInput } from './audit-write-queue.service';
import { TenantContext } from '../tenant-context/tenant-context.service';

@Injectable()
export class AuditService {
  constructor(
    private readonly queue: AuditWriteQueueService,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Imperative audit write. Prefer the @Audit/@AuditRead decorators on
   * controllers — this is for non-controller flows (bootstrap, migrations
   * exposed via controllers, deep service events).
   */
  log(
    actorId: string,
    action: string,
    details?: Record<string, any>,
    overrides: Partial<AuditEntryInput> = {},
  ): void {
    this.queue.enqueue({
      actorId,
      actorRole: this.tenantContext.role || undefined,
      labId: this.tenantContext.labId,
      action,
      details,
      ...overrides,
    });
  }
}
