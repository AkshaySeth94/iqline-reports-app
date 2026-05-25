import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../../tenant-context/tenant-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContext) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const u = (req as any).user;
      const line = JSON.stringify({
        type: 'http',
        requestId,
        userId: u?.userId ?? null,
        labId: u?.labId ?? null,
        route: req.url,
        method: req.method,
        status: res.statusCode,
        durationMs: duration,
        ts: new Date().toISOString(),
      });
      process.stdout.write(line + '\n');
    });

    // Wrap the rest of the request in an AsyncLocalStorage store so
    // TenantContext.populate() (called later by ActiveStatusGuard /
    // LabScopeInterceptor) writes into this request's slot.
    this.tenantContext.als.run(
      { userId: null, role: null, labId: null, isCrossTenantRead: false },
      () => next(),
    );
  }
}
