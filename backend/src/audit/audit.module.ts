import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditWriteQueueService } from './audit-write-queue.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditSearchController } from './audit-search.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditSearchController],
  providers: [AuditService, AuditWriteQueueService, AuditInterceptor],
  exports: [AuditService, AuditWriteQueueService, AuditInterceptor, MongooseModule],
})
export class AuditModule {}
