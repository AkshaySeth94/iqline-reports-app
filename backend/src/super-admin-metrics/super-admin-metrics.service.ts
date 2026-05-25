import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lab } from '../labs/schemas/lab.schema';
import { User } from '../users/schemas/user.schema';
import { Report } from '../reports/schemas/report.schema';
import { EntityStatus } from '../common/enums/status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PatientLabLink } from '../patient-lab-links/schemas/patient-lab-link.schema';

@Injectable()
export class SuperAdminMetricsService {
  constructor(
    @InjectModel(Lab.name) private labModel: Model<Lab>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(PatientLabLink.name) private linkModel: Model<PatientLabLink>,
  ) {}

  async tiles() {
    const now = new Date();
    const seven = new Date(now.getTime() - 7 * 86400_000);
    const thirty = new Date(now.getTime() - 30 * 86400_000);

    const [activeLabs, activePatients, last7, last30] = await Promise.all([
      this.labModel.countDocuments({ status: EntityStatus.Active }),
      this.linkModel.distinct('patientId').then((ids) => ids.length),
      this.reportModel.countDocuments({ deletedAt: null, createdAt: { $gte: seven } }),
      this.reportModel.countDocuments({ deletedAt: null, createdAt: { $gte: thirty } }),
    ]);
    return {
      activeLabs,
      activePatients,
      reportsLast7Days: last7,
      reportsLast30Days: last30,
    };
  }
}
