import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true, index: true })
  actorId: string;

  @Prop({ type: String, enum: UserRole })
  actorRole?: UserRole;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lab', default: null, index: true })
  labId: Types.ObjectId | null;

  @Prop({ required: true, index: true })
  action: string;

  @Prop() targetType?: string;
  @Prop() targetId?: string;

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ labId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
// 24-month TTL retention (NFR-P3 / FR-702)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });
