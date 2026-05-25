import { lastValueFrom, of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { AUDIT_KEY, AUDIT_READ_KEY } from './decorators/audit.decorator';
import { UserRole } from '../common/enums/user-role.enum';

function makeContext(opts: {
  user?: any;
  body?: any;
  params?: any;
  method?: string;
  url?: string;
  ip?: string;
  ua?: string;
} = {}) {
  const req: any = {
    user: opts.user,
    body: opts.body,
    params: opts.params || {},
    query: {},
    method: opts.method || 'POST',
    url: opts.url || '/api/v1/reports',
    route: { path: '/api/v1/reports' },
    ip: opts.ip || '127.0.0.1',
    headers: { 'user-agent': opts.ua || 'jest' },
  };
  const handler = () => {};
  const ctx: any = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => ({}),
  };
  return { ctx, req, handler };
}

function makeInterceptor(decoratorMap: Map<any, any>) {
  const reflector = {
    get: jest.fn((key: any, _handler: any) => decoratorMap.get(key)),
  } as any as Reflector;
  const queue = { enqueue: jest.fn() } as any;
  return { interceptor: new AuditInterceptor(reflector, queue), queue, reflector };
}

describe('AuditInterceptor', () => {
  it('is a no-op when neither @Audit nor @AuditRead is present', async () => {
    const map = new Map();
    const { interceptor, queue } = makeInterceptor(map);
    const { ctx } = makeContext({ user: { role: UserRole.LabAdmin } });
    const out = await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of('result') } as any),
    );
    expect(out).toBe('result');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues an entry with actor+role+labId from req.user when @Audit is present', async () => {
    const map = new Map([[AUDIT_KEY, 'report.created']]);
    const { interceptor, queue } = makeInterceptor(map);
    const { ctx } = makeContext({
      user: { userId: 'u-lab', role: UserRole.LabAdmin, labId: 'lab-a' },
      body: { glucoseValue: 100, password: 'secret' },
    });
    await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of({ _id: 'r1' }) } as any),
    );
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    const entry = queue.enqueue.mock.calls[0][0];
    expect(entry).toMatchObject({
      actorId: 'u-lab',
      actorRole: UserRole.LabAdmin,
      labId: 'lab-a',
      action: 'report.created',
      targetType: 'report',
      targetId: 'r1',
    });
  });

  it('redacts password/otp/secret/token fields in details.body', async () => {
    const map = new Map([[AUDIT_KEY, 'auth.change']]);
    const { interceptor, queue } = makeInterceptor(map);
    const { ctx } = makeContext({
      user: { userId: 'u', role: 'LabAdmin' },
      body: { newPassword: 'hunter2', otp: '123456', notes: 'kept', token: 'abc' },
    });
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({}) } as any));
    const details = queue.enqueue.mock.calls[0][0].details;
    expect(details.body.newPassword).toBe('[REDACTED]');
    expect(details.body.otp).toBe('[REDACTED]');
    expect(details.body.token).toBe('[REDACTED]');
    expect(details.body.notes).toBe('kept');
  });

  it('on a SuperAdmin @AuditRead, also enqueues a cross-tenant.read entry', async () => {
    const map = new Map([[AUDIT_READ_KEY, 'lab.detail.read']]);
    const { interceptor, queue } = makeInterceptor(map);
    const { ctx } = makeContext({
      user: { userId: 'u-super', role: UserRole.SuperAdmin, labId: null },
      params: { id: 'lab-a' },
    });
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of(null) } as any));
    expect(queue.enqueue).toHaveBeenCalledTimes(2);
    expect(queue.enqueue.mock.calls[1][0].action).toBe('cross-tenant.read');
  });

  it('uses params.id as targetId when present', async () => {
    const map = new Map([[AUDIT_KEY, 'report.updated']]);
    const { interceptor, queue } = makeInterceptor(map);
    const { ctx } = makeContext({
      user: { userId: 'u', role: 'LabAdmin' },
      params: { id: 'r-from-path' },
    });
    await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of({ _id: 'r-from-body' }) } as any),
    );
    expect(queue.enqueue.mock.calls[0][0].targetId).toBe('r-from-path');
  });

  it('falls back to actorId="system" when req.user is missing', async () => {
    const map = new Map([[AUDIT_KEY, 'bootstrap.event']]);
    const { interceptor, queue } = makeInterceptor(map);
    const { ctx } = makeContext({ user: undefined });
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({}) } as any));
    expect(queue.enqueue.mock.calls[0][0].actorId).toBe('system');
  });
});
