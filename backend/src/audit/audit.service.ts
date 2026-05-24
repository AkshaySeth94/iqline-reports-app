import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  async log(
    actorId: string,
    action: string,
    details: Record<string, any>,
  ): Promise<AuditLog> {
    const newLog = new this.auditLogModel({
      actorId,
      action,
      details,
    });
    return newLog.save();
  }
}
