import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminMetricsService } from './super-admin-metrics.service';
import { SuperAdminMetricsController } from './super-admin-metrics.controller';
import { Lab, LabSchema } from '../labs/schemas/lab.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Report, ReportSchema } from '../reports/schemas/report.schema';
import {
  PatientLabLink,
  PatientLabLinkSchema,
} from '../patient-lab-links/schemas/patient-lab-link.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lab.name, schema: LabSchema },
      { name: User.name, schema: UserSchema },
      { name: Report.name, schema: ReportSchema },
      { name: PatientLabLink.name, schema: PatientLabLinkSchema },
    ]),
  ],
  controllers: [SuperAdminMetricsController],
  providers: [SuperAdminMetricsService],
})
export class SuperAdminMetricsModule {}
