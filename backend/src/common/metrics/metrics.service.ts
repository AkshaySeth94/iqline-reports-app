import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger('Metrics');

  increment(counter: string, tags: Record<string, string | number | undefined> = {}) {
    const cleanTags: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(tags)) {
      if (v !== undefined && v !== null) cleanTags[k] = v as string | number;
    }
    const line = JSON.stringify({
      type: 'metric',
      kind: 'counter',
      name: counter,
      delta: 1,
      tags: cleanTags,
      ts: new Date().toISOString(),
    });
    // stdout JSON line — downstream collector ships to metrics backend
    process.stdout.write(line + '\n');
  }
}
