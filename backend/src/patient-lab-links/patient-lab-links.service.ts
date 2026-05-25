import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PatientLabLink } from './schemas/patient-lab-link.schema';
import { User } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantContext } from '../tenant-context/tenant-context.service';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class PatientLabLinksService {
  constructor(
    @InjectModel(PatientLabLink.name) private linkModel: Model<PatientLabLink>,
    @InjectModel(User.name) private userModel: Model<User>,
    private tenant: TenantContext,
    private metrics: MetricsService,
  ) {}

  /**
   * Idempotent upsert. Creates the link if missing, no-ops if already linked.
   * LabAdmins can only link to their own lab; SuperAdmin can specify labId.
   */
  async link(
    patientId: string,
    labIdOverride?: string,
  ): Promise<PatientLabLink> {
    const labId =
      this.tenant.role === UserRole.SuperAdmin && labIdOverride
        ? labIdOverride
        : this.tenant.labId;
    if (!labId) throw new ForbiddenException('No lab context');

    const result = await this.linkModel
      .findOneAndUpdate(
        {
          patientId: new Types.ObjectId(patientId),
          labId: new Types.ObjectId(labId),
        },
        {
          $setOnInsert: {
            patientId: new Types.ObjectId(patientId),
            labId: new Types.ObjectId(labId),
            linkedByAdminId: this.tenant.userId
              ? new Types.ObjectId(this.tenant.userId)
              : undefined,
            linkedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    this.metrics.increment('patients.linked', { labId });
    return result!;
  }

  async listPatientsForCurrentLab(opts: {
    search?: string;
    cursor?: string;
    limit?: number;
  } = {}): Promise<{ items: any[]; nextCursor: string | null }> {
    if (!this.tenant.labId) throw new ForbiddenException('No lab context');
    const labId = new Types.ObjectId(this.tenant.labId);
    const limit = Math.min(Math.max(opts.limit || 50, 1), 200);

    const match: any = { labId };
    if (opts.cursor) match._id = { $lt: new Types.ObjectId(opts.cursor) };

    const pipeline: any[] = [
      { $match: match },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: 'users',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      { $unwind: '$patient' },
    ];

    if (opts.search) {
      // Phone search — exact-ish match preferred for NFR-Pe2 indexing
      const trimmed = opts.search.trim();
      if (trimmed.length >= 10) {
        // attach the search at the user level
        pipeline.push({
          $match: {
            $or: [
              { 'patient.phone': trimmed },
              { 'patient.phone': new RegExp(escapeRegex(trimmed)) },
            ],
          },
        });
      }
    }

    const rows = await this.linkModel.aggregate(pipeline).exec();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row: any) => ({
        linkId: row._id,
        patientId: row.patientId,
        labId: row.labId,
        linkedAt: row.linkedAt,
        name: row.patient.name,
        phone: row.patient.phone,
        dateOfBirth: row.patient.dateOfBirth ?? null,
      })),
      nextCursor: hasMore ? page[page.length - 1]._id.toString() : null,
    };
  }

  async isPatientLinkedToCurrentLab(patientId: string): Promise<boolean> {
    if (!this.tenant.labId) return false;
    const count = await this.linkModel
      .countDocuments({
        patientId: new Types.ObjectId(patientId),
        labId: new Types.ObjectId(this.tenant.labId),
      })
      .exec();
    return count > 0;
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
