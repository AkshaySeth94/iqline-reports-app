import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';
import { EntityStatus } from '../../common/enums/status.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  phone: string;

  /** Bcrypt-hashed password. Excluded from default query results. */
  @Prop({ type: String, select: false })
  password?: string;

  /** True after admin-seeded / temp-password creation; cleared on first successful self-change. */
  @Prop({ type: Boolean, default: false })
  forcePasswordChange: boolean;

  @Prop({ type: String, required: true, enum: UserRole })
  role: UserRole;

  @Prop({
    type: String,
    required: true,
    enum: EntityStatus,
    default: EntityStatus.Active,
    index: true,
  })
  status: EntityStatus;

  /** Required for LabAdmins; null for SuperAdmin and Patient. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lab', default: null, index: true })
  labId: Types.ObjectId | null;

  /** Set on first patient login after ToS modal acknowledgment. */
  @Prop({ type: Date, default: null })
  termsAcknowledgedAt: Date | null;

  /** Last successful login — used in SuperAdmin lab-admin list. */
  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  /** Patients only; required for cross-lab match dialog disclosure. */
  @Prop({ type: Date, default: null })
  dateOfBirth: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ labId: 1, role: 1 });
