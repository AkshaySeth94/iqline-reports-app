import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lab } from './schemas/lab.schema';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { EntityStatus } from '../common/enums/status.enum';
import { Report } from '../reports/schemas/report.schema';
import { PatientLabLink } from '../patient-lab-links/schemas/patient-lab-link.schema';
import { MetricsService } from '../common/metrics/metrics.service';

export interface ListLabsParams {
  search?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class LabsService {
  constructor(
    @InjectModel(Lab.name) private labModel: Model<Lab>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(PatientLabLink.name) private linkModel: Model<PatientLabLink>,
    private metrics: MetricsService,
  ) {}

  async create(dto: CreateLabDto): Promise<Lab> {
    try {
      const lab = await new this.labModel({
        ...dto,
        status: EntityStatus.Active,
      }).save();
      return lab;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException(
          'A lab with that name or license number already exists',
        );
      }
      throw err;
    }
  }

  async list(params: ListLabsParams = {}): Promise<{ items: any[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit || 50, 1), 200);
    const filter: any = {};
    if (params.search && params.search.length >= 2) {
      const rx = new RegExp(escape(params.search), 'i');
      filter.$or = [{ name: rx }, { licenseNumber: rx }];
    }
    if (params.cursor) filter._id = { $lt: new Types.ObjectId(params.cursor) };

    const labs = await this.labModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = labs.length > limit;
    const page = hasMore ? labs.slice(0, limit) : labs;

    const labIds = page.map((l) => l._id);
    const [reportCounts, patientCounts] = await Promise.all([
      this.reportModel.aggregate([
        { $match: { labId: { $in: labIds }, deletedAt: null } },
        { $group: { _id: '$labId', count: { $sum: 1 } } },
      ]),
      this.linkModel.aggregate([
        { $match: { labId: { $in: labIds } } },
        { $group: { _id: '$labId', count: { $sum: 1 } } },
      ]),
    ]);
    const rcMap = new Map(reportCounts.map((r: any) => [r._id.toString(), r.count]));
    const pcMap = new Map(patientCounts.map((r: any) => [r._id.toString(), r.count]));

    const items = page.map((l: any) => ({
      ...l,
      reportCount: rcMap.get(l._id.toString()) || 0,
      patientCount: pcMap.get(l._id.toString()) || 0,
    }));

    return {
      items,
      nextCursor: hasMore ? page[page.length - 1]._id.toString() : null,
    };
  }

  async findById(id: string): Promise<Lab> {
    const lab = await this.labModel.findById(id).exec();
    if (!lab) throw new NotFoundException(`Lab ${id} not found`);
    return lab;
  }

  /** LabAdmin self-read of their own lab — no SuperAdmin counts. */
  async findByIdLean(id: string): Promise<any> {
    const lab = await this.labModel.findById(id).lean().exec();
    if (!lab) throw new NotFoundException(`Lab ${id} not found`);
    return lab;
  }

  async update(id: string, dto: UpdateLabDto): Promise<Lab> {
    const lab = await this.labModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!lab) throw new NotFoundException(`Lab ${id} not found`);
    return lab;
  }

  async setStatus(id: string, status: EntityStatus): Promise<Lab> {
    const lab = await this.labModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!lab) throw new NotFoundException(`Lab ${id} not found`);
    if (status === EntityStatus.Suspended) {
      this.metrics.increment('labs.suspended', { labId: id });
    }
    return lab;
  }

  async getDetail(id: string): Promise<any> {
    const lab = await this.findById(id);
    const labId = new Types.ObjectId(id);
    const now = new Date();
    const seven = new Date(now.getTime() - 7 * 86400_000);
    const thirty = new Date(now.getTime() - 30 * 86400_000);
    const fourWeeks = new Date(now.getTime() - 28 * 86400_000);

    const [last7, last30, patientCount, weekly] = await Promise.all([
      this.reportModel.countDocuments({ labId, deletedAt: null, createdAt: { $gte: seven } }),
      this.reportModel.countDocuments({ labId, deletedAt: null, createdAt: { $gte: thirty } }),
      this.linkModel.countDocuments({ labId }),
      this.reportModel.aggregate([
        { $match: { labId, deletedAt: null, createdAt: { $gte: fourWeeks } } },
        {
          $group: {
            _id: {
              week: { $isoWeek: '$createdAt' },
              year: { $isoWeekYear: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),
    ]);

    return {
      ...lab.toObject(),
      counts: {
        reportsLast7: last7,
        reportsLast30: last30,
        patientCount,
        weeklyReports: weekly.map((w: any) => ({ week: w._id.week, year: w._id.year, count: w.count })),
      },
    };
  }
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
