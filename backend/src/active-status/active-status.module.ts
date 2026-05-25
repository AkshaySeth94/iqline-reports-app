import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActiveStatusGuard } from './active-status.guard';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Lab, LabSchema } from '../labs/schemas/lab.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Lab.name, schema: LabSchema },
    ]),
  ],
  providers: [ActiveStatusGuard],
  exports: [ActiveStatusGuard, MongooseModule],
})
export class ActiveStatusModule {}
