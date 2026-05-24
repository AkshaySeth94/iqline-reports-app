import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { ReportStatus } from '../../common/enums/report-status.enum';

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  patient: Types.ObjectId;

  @Prop({ required: true })
  reportDate: Date;

  @Prop({ required: true, enum: ReportStatus })
  status: ReportStatus;

  @Prop()
  notes?: string;

  @Prop({ required: true })
  reportType: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
