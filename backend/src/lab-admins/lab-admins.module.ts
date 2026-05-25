import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LabAdminsService } from './lab-admins.service';
import { LabAdminsController } from './lab-admins.controller';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [LabAdminsController],
  providers: [LabAdminsService],
  exports: [LabAdminsService],
})
export class LabAdminsModule {}
