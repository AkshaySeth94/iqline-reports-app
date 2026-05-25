import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientLabLinksService } from './patient-lab-links.service';
import {
  PatientLabLink,
  PatientLabLinkSchema,
} from './schemas/patient-lab-link.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientLabLink.name, schema: PatientLabLinkSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [PatientLabLinksService],
  exports: [PatientLabLinksService, MongooseModule],
})
export class PatientLabLinksModule {}
