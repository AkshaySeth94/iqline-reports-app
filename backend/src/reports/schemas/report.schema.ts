import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types, Query } from 'mongoose';
import { ReportStatus } from '../../common/enums/report-status.enum';
import { MealContext } from '../../common/enums/meal-context.enum';
import { GlucoseUnit } from '../../common/enums/glucose-unit.enum';

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  patient: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lab', required: true, index: true })
  labId: Types.ObjectId;

  @Prop({ required: true })
  reportDate: Date;

  @Prop({ type: String, required: true, enum: ReportStatus, default: ReportStatus.Final })
  status: ReportStatus;

  @Prop()
  notes?: string;

  @Prop({ required: true, default: 'glucose' })
  reportType: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  data: Record<string, any>;

  @Prop({ type: String, required: true, enum: MealContext, default: MealContext.Random })
  mealContext: MealContext;

  @Prop({ type: String, required: true, enum: GlucoseUnit, default: GlucoseUnit.MgDl })
  unit: GlucoseUnit;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: null, index: { sparse: true } })
  deletedAt: Date | null;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index({ labId: 1, patientId: 1, reportDate: -1 });
ReportSchema.index({ labId: 1, patient: 1, reportDate: -1 });
ReportSchema.index({ patient: 1, reportDate: -1 });
ReportSchema.index({ labId: 1, createdAt: -1 });

// Query helpers — typed via Mongoose's `query` namespace
(ReportSchema.query as any).alive = function alive(this: Query<any, any>) {
  return this.where({ deletedAt: null });
};
(ReportSchema.query as any).withDeleted = function withDeleted(
  this: Query<any, any>,
) {
  return this;
};
