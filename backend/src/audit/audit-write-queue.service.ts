import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';
import { MetricsService } from '../common/metrics/metrics.service';

export interface AuditEntryInput {
  actorId: string;
  actorRole?: string;
  labId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface QueuedEntry extends AuditEntryInput {
  attempts: number;
}

const MAX_QUEUE = 5000;
const MAX_ATTEMPTS = 3;
const FLUSH_INTERVAL_MS = 50;

@Injectable()
export class AuditWriteQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditWriteQueueService.name);
  private queue: QueuedEntry[] = [];
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.drain().catch(() => {}), FLUSH_INTERVAL_MS);
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.drain();
  }

  enqueue(entry: AuditEntryInput): void {
    if (this.queue.length >= MAX_QUEUE) {
      this.metrics.increment('audit.write.failure', { reason: 'queue-overflow' });
      this.logger.error(
        `Audit queue overflow — dropping entry: ${JSON.stringify(entry)}`,
      );
      return;
    }
    this.queue.push({ ...entry, attempts: 0 });
  }

  private async drain(): Promise<void> {
    if (this.draining || this.queue.length === 0) return;
    this.draining = true;
    try {
      const batch = this.queue.splice(0, Math.min(50, this.queue.length));
      const docs = batch.map((e) => ({
        actorId: e.actorId,
        actorRole: e.actorRole,
        labId: e.labId || null,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        details: e.details,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
      }));
      try {
        await this.auditModel.insertMany(docs, { ordered: false });
      } catch (err) {
        // Re-queue with backoff if attempts remain
        for (const entry of batch) {
          entry.attempts += 1;
          if (entry.attempts < MAX_ATTEMPTS) {
            this.queue.push(entry);
          } else {
            this.metrics.increment('audit.write.failure', { reason: 'max-attempts' });
            this.logger.error(
              `Audit write failed after ${MAX_ATTEMPTS} attempts: ${JSON.stringify(entry)} (${(err as Error).message})`,
            );
          }
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
