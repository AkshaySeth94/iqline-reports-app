import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new MetricsService();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  function lastLine() {
    return stdoutSpy.mock.calls[stdoutSpy.mock.calls.length - 1][0] as string;
  }

  it('writes a JSON line to stdout with kind+name+delta', () => {
    service.increment('reports.created', { labId: 'abc' });
    const line = lastLine();
    const parsed = JSON.parse(line.trim());
    expect(parsed.type).toBe('metric');
    expect(parsed.kind).toBe('counter');
    expect(parsed.name).toBe('reports.created');
    expect(parsed.delta).toBe(1);
    expect(parsed.tags).toEqual({ labId: 'abc' });
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('omits undefined/null tag values', () => {
    service.increment('login.failure', { reason: 'invalid-otp', labId: undefined });
    const parsed = JSON.parse(lastLine().trim());
    expect(parsed.tags).toEqual({ reason: 'invalid-otp' });
  });

  it('appends a newline so downstream collectors can split', () => {
    service.increment('x');
    expect(lastLine()).toMatch(/\n$/);
  });
});
