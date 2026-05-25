import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityStatus } from '../../common/enums/status.enum';

@Schema({ _id: false })
export class LabAddress {
  @Prop() line1?: string;
  @Prop() line2?: string;
  @Prop() city?: string;
  @Prop() state?: string;
  @Prop() postalCode?: string;
  @Prop() country?: string;
}
export const LabAddressSchema = SchemaFactory.createForClass(LabAddress);

@Schema({ timestamps: true })
export class Lab extends Document {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  licenseNumber: string;

  @Prop({ type: LabAddressSchema })
  address?: LabAddress;

  @Prop() primaryContactName?: string;
  @Prop() primaryContactPhone?: string;
  @Prop() primaryContactEmail?: string;

  @Prop({
    type: String,
    required: true,
    enum: EntityStatus,
    default: EntityStatus.Active,
    index: true,
  })
  status: EntityStatus;

  @Prop({ default: false })
  isMigrationDefault: boolean;
}

export const LabSchema = SchemaFactory.createForClass(Lab);
LabSchema.index({ name: 1 }, { unique: true });
LabSchema.index({ licenseNumber: 1 }, { unique: true });
LabSchema.index({ status: 1 });
