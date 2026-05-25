import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditWriteQueueService } from './audit-write-queue.service';
import { AUDIT_KEY, AUDIT_READ_KEY } from './decorators/audit.decorator';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Reads @Audit/@AuditRead decorator metadata and enqueues an audit entry
 * on every audited call. Reads tenant fields from req.user (set by
 * ActiveStatusGuard) — does NOT inject TenantContext, because that would
 * cascade this interceptor into request scope and break Reflector
 * resolution under APP_INTERCEPTOR registration.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditQueue: AuditWriteQueueService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const writeAction = this.reflector.get<string>(AUDIT_KEY, context.getHandler());
    const readAction = this.reflector.get<string>(AUDIT_READ_KEY, context.getHandler());
    const action = writeAction || readAction;
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: (result: any) => {
          const u = req.user || {};
          const actorId = u.userId || u.sub || 'system';
          const actorRole = u.role;
          const labId = u.labId ?? null;
          const targetId = this.extractTargetId(req, result);
          this.auditQueue.enqueue({
            actorId,
            actorRole,
            labId,
            action,
            targetType: this.extractTargetType(action),
            targetId,
            details: this.buildDetails(req, result),
            ipAddress: req.ip,
            userAgent: req.headers?.['user-agent'],
          });
          if (readAction && actorRole === UserRole.SuperAdmin) {
            this.auditQueue.enqueue({
              actorId,
              actorRole: UserRole.SuperAdmin,
              labId,
              action: 'cross-tenant.read',
              details: { route: req.route?.path, originalAction: action },
              ipAddress: req.ip,
              userAgent: req.headers?.['user-agent'],
            });
          }
        },
      }),
    );
  }

  private extractTargetType(action: string): string | undefined {
    const dot = action.indexOf('.');
    return dot > 0 ? action.slice(0, dot) : undefined;
  }

  private extractTargetId(req: any, result: any): string | undefined {
    if (req.params?.id) return String(req.params.id);
    if (result?._id) return String(result._id);
    return undefined;
  }

  private buildDetails(req: any, result: any): Record<string, any> {
    const details: Record<string, any> = {
      method: req.method,
      path: req.route?.path || req.url,
    };
    if (req.body && Object.keys(req.body).length > 0) {
      details.body = this.redact(req.body);
    }
    if (req.query && Object.keys(req.query).length > 0) {
      details.query = req.query;
    }
    return details;
  }

  private redact(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const out: any = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (/password|otp|secret|token/i.test(k)) out[k] = '[REDACTED]';
      else if (typeof v === 'object' && v !== null) out[k] = this.redact(v);
      else out[k] = v;
    }
    return out;
  }
}
