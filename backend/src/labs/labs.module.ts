import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { Lab, LabSchema } from './schemas/lab.schema';
import { Report, ReportSchema } from '../reports/schemas/report.schema';
import {
  PatientLabLink,
  PatientLabLinkSchema,
} from '../patient-lab-links/schemas/patient-lab-link.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lab.name, schema: LabSchema },
      { name: Report.name, schema: ReportSchema },
      { name: PatientLabLink.name, schema: PatientLabLinkSchema },
    ]),
  ],
  controllers: [LabsController],
  providers: [LabsService],
  exports: [LabsService, MongooseModule],
})
export class LabsModule {}
