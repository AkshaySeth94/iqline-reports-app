import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report } from './schemas/report.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    adminId: string,
  ): Promise<Report> {
    const createdReport = new this.reportModel({
      ...createReportDto,
      patient: createReportDto.patient,
      createdBy: adminId,
      updatedBy: adminId,
    });
    const savedReport = await createdReport.save();
    await this.auditService.log(adminId, 'REPORT_CREATED', {
      reportId: savedReport._id.toString(),
      patientId: createReportDto.patient,
    });
    return savedReport;
  }

  async findAllForPatient(patientId: string): Promise<Report[]> {
    return this.reportModel
      .find({ patient: patientId })
      .sort({ reportDate: -1 })
      .exec();
  }

  async findOne(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Report> {
    const report = await this.reportModel.findById(id).exec();
    if (!report) {
      throw new NotFoundException(`Report with ID "${id}" not found`);
    }

    if (
      userRole === UserRole.Patient &&
      report.patient.toString() !== userId
    ) {
      throw new ForbiddenException('Access to this resource is denied');
    }

    return report;
  }

  async update(
    id: string,
    updateReportDto: UpdateReportDto,
    adminId: string,
  ): Promise<Report> {
    const existingReport = await this.reportModel
      .findByIdAndUpdate(
        id,
        { ...updateReportDto, updatedBy: adminId },
        { new: true },
      )
      .exec();

    if (!existingReport) {
      throw new NotFoundException(`Report with ID "${id}" not found`);
    }

    await this.auditService.log(adminId, 'REPORT_UPDATED', { reportId: id });
    return existingReport;
  }
}
