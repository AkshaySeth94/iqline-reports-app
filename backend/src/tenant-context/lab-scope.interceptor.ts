import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context.service';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Populates the request-scoped TenantContext from the DB-verified req.user
 * (set by ActiveStatusGuard). On public routes req.user is null so the
 * populate is a no-op — we deliberately skip the Reflector check because
 * request-scoped APP_INTERCEPTORs can't reliably receive Reflector in some
 * NestJS versions, and the populate path is safe to skip anyway.
 */
@Injectable()
export class LabScopeInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (user) {
      this.tenantContext.populate({
        userId: user.userId || user.sub,
        role: user.role,
        labId: user.labId ?? null,
      });
      if (user.role === UserRole.SuperAdmin) {
        this.tenantContext.isCrossTenantRead = true;
      }
    }
    return next.handle();
  }
}
