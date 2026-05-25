import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PatientLabLink extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lab', required: true })
  labId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  linkedByAdminId?: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  linkedAt: Date;
}

export const PatientLabLinkSchema = SchemaFactory.createForClass(PatientLabLink);
PatientLabLinkSchema.index({ patientId: 1, labId: 1 }, { unique: true });
PatientLabLinkSchema.index({ labId: 1, patientId: 1 });
PatientLabLinkSchema.index({ labId: 1, linkedAt: -1 });
