import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  phone: string;

  @Prop({ required: false, select: false })
  password?: string;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
