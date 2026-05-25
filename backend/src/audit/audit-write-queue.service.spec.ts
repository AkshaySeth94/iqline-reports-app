import { AuditWriteQueueService } from './audit-write-queue.service';

function makeService(opts: { insertImpl?: () => Promise<any> } = {}) {
  const insertMany = opts.insertImpl
    ? jest.fn().mockImplementation(opts.insertImpl)
    : jest.fn().mockResolvedValue([]);
  const auditModel: any = { insertMany };
  const metrics = { increment: jest.fn() };
  const service = new AuditWriteQueueService(auditModel, metrics as any);
  return { service, insertMany, metrics };
}

describe('AuditWriteQueueService', () => {
  afterEach(() => jest.useRealTimers());

  it('enqueue does not synchronously hit the DB', () => {
    const { service, insertMany } = makeService();
    service.enqueue({ actorId: 'u1', action: 'x' });
    expect(insertMany).not.toHaveBeenCalled();
  });

  it('drain inserts queued entries via insertMany', async () => {
    const { service, insertMany } = makeService();
    service.enqueue({ actorId: 'u1', action: 'x' });
    service.enqueue({ actorId: 'u2', action: 'y' });
    // Reach into the private drain via the timer
    await (service as any).drain();
    expect(insertMany).toHaveBeenCalledTimes(1);
    expect(insertMany.mock.calls[0][0]).toHaveLength(2);
  });

  it('retries on failure up to MAX_ATTEMPTS then drops + emits audit.write.failure', async () => {
    const { service, insertMany, metrics } = makeService({
      insertImpl: async () => { throw new Error('mongo down'); },
    });
    service.enqueue({ actorId: 'u1', action: 'x' });

    // First drain: attempt 1 fails, entry re-queued with attempts=1
    await (service as any).drain();
    expect((service as any).queue).toHaveLength(1);
    expect((service as any).queue[0].attempts).toBe(1);

    // Drain again: attempt 2 fails, re-queued attempts=2
    await (service as any).drain();
    expect((service as any).queue[0].attempts).toBe(2);

    // Drain again: attempt 3 fails, dropped (no more re-queue)
    await (service as any).drain();
    expect((service as any).queue).toHaveLength(0);
    expect(metrics.increment).toHaveBeenCalledWith('audit.write.failure', {
      reason: 'max-attempts',
    });
  });

  it('drops new entries when queue is full and emits queue-overflow metric', () => {
    const { service, metrics } = makeService();
    // MAX_QUEUE is 5000 — pre-fill manually so we don't actually loop 5000+ times
    (service as any).queue = new Array(5000).fill({ actorId: 'x', action: 'x', attempts: 0 });
    service.enqueue({ actorId: 'overflow', action: 'x' });
    expect(metrics.increment).toHaveBeenCalledWith('audit.write.failure', {
      reason: 'queue-overflow',
    });
    expect((service as any).queue).toHaveLength(5000); // unchanged
  });

  it('drain is a no-op on empty queue', async () => {
    const { service, insertMany } = makeService();
    await (service as any).drain();
    expect(insertMany).not.toHaveBeenCalled();
  });
});
