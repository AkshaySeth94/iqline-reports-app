import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report } from './schemas/report.schema';
import { Lab } from '../labs/schemas/lab.schema';
import { ReportStatus } from '../common/enums/report-status.enum';
import { MealContext } from '../common/enums/meal-context.enum';
import { GlucoseUnit } from '../common/enums/glucose-unit.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantContext } from '../tenant-context/tenant-context.service';
import { PatientLabLinksService } from '../patient-lab-links/patient-lab-links.service';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(Lab.name) private labModel: Model<Lab>,
    private tenant: TenantContext,
    private links: PatientLabLinksService,
    private metrics: MetricsService,
  ) {}

  async create(dto: CreateReportDto): Promise<Report> {
    if (!this.tenant.labId)
      throw new ForbiddenException('No lab context');
    const labId = new Types.ObjectId(this.tenant.labId);

    // Patient must be linked to this lab (FR-303 strict isolation)
    const linked = await this.links.isPatientLinkedToCurrentLab(dto.patient);
    if (!linked) throw new ForbiddenException('Patient not linked to this lab');

    // Detect first-report for this lab (for lab.first-report.recorded metric)
    const labFirstCount = await this.reportModel
      .countDocuments({ labId })
      .exec();

    const report = new this.reportModel({
      patient: new Types.ObjectId(dto.patient),
      labId,
      reportDate: new Date(dto.reportDate),
      status: dto.status || ReportStatus.Final,
      notes: dto.notes,
      reportType: 'glucose',
      data: { glucoseValue: dto.glucoseValue },
      mealContext: dto.mealContext || MealContext.Random,
      unit: dto.unit || GlucoseUnit.MgDl,
      createdBy: new Types.ObjectId(this.tenant.userId!),
      updatedBy: new Types.ObjectId(this.tenant.userId!),
    });
    const saved = await report.save();
    this.metrics.increment('reports.created', { labId: this.tenant.labId });
    if (labFirstCount === 0) {
      this.metrics.increment('lab.first-report.recorded', { labId: this.tenant.labId });
    }
    return saved;
  }

  /** LabAdmin: this-lab reports for a patient. */
  async listForPatientThisLab(patientId: string): Promise<Report[]> {
    if (!this.tenant.labId)
      throw new ForbiddenException('No lab context');
    const reports = await this.reportModel
      .find({
        labId: new Types.ObjectId(this.tenant.labId),
        patient: new Types.ObjectId(patientId),
      })
      .where({ deletedAt: null })
      .sort({ reportDate: -1 })
      .lean()
      .exec();
    this.tenant.assertLabIdOf(reports as any, 'reports.listForPatientThisLab');
    return reports as any;
  }

  /** Patient aggregated cross-lab read — patientId from JWT sub. */
  async listForPatientAggregated(patientId: string): Promise<any[]> {
    return this.reportModel
      .aggregate([
        {
          $match: {
            patient: new Types.ObjectId(patientId),
            deletedAt: null,
          },
        },
        { $sort: { reportDate: -1 } },
        {
          $lookup: {
            from: 'labs',
            localField: 'labId',
            foreignField: '_id',
            as: 'lab',
          },
        },
        { $unwind: { path: '$lab', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            reportDate: 1,
            data: 1,
            status: 1,
            notes: 1,
            mealContext: 1,
            unit: 1,
            createdAt: 1,
            lab: {
              _id: '$lab._id',
              name: '$lab.name',
              licenseNumber: '$lab.licenseNumber',
              status: '$lab.status',
            },
          },
        },
      ])
      .exec();
  }

  async findOne(id: string): Promise<Report> {
    const r = await this.reportModel.findById(id).where({ deletedAt: null }).exec();
    if (!r) throw new NotFoundException(`Report ${id} not found`);
    if (this.tenant.role === UserRole.LabAdmin) {
      this.tenant.assertLabIdOf(r as any, 'reports.findOne');
    } else if (this.tenant.role === UserRole.Patient) {
      if (r.patient.toString() !== this.tenant.userId) {
        throw new NotFoundException();
      }
    }
    return r;
  }

  async update(id: string, dto: UpdateReportDto): Promise<Report> {
    const r = await this.reportModel.findById(id).where({ deletedAt: null }).exec();
    if (!r) throw new NotFoundException(`Report ${id} not found`);
    this.tenant.assertLabIdOf(r as any, 'reports.update');

    // FR-302: Final reports are immutable unless transitioning to Corrected
    if (r.status === ReportStatus.Final) {
      if (dto.status !== ReportStatus.Corrected) {
        throw new ConflictException(
          'Final reports cannot be edited; transition to Corrected first',
        );
      }
    }

    // strip never-editable fields if present
    const update: any = {
      updatedBy: new Types.ObjectId(this.tenant.userId!),
    };
    if (dto.glucoseValue !== undefined)
      update.data = { ...r.data, glucoseValue: dto.glucoseValue };
    if (dto.unit !== undefined) update.unit = dto.unit;
    if (dto.mealContext !== undefined) update.mealContext = dto.mealContext;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.notes !== undefined) update.notes = dto.notes;

    const updated = await this.reportModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    return updated!;
  }

  async softDelete(id: string, reason?: string): Promise<void> {
    const r = await this.reportModel.findById(id).where({ deletedAt: null }).exec();
    if (!r) throw new NotFoundException(`Report ${id} not found`);
    this.tenant.assertLabIdOf(r as any, 'reports.softDelete');
    await this.reportModel
      .updateOne(
        { _id: id },
        {
          deletedAt: new Date(),
          updatedBy: new Types.ObjectId(this.tenant.userId!),
        },
      )
      .exec();
  }
}
