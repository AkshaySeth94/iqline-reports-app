import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  PatientLabLink,
  PatientLabLinkSchema,
} from '../patient-lab-links/schemas/patient-lab-link.schema';
import { PatientLabLinksModule } from '../patient-lab-links/patient-lab-links.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientLabLink.name, schema: PatientLabLinkSchema },
    ]),
    PatientLabLinksModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
