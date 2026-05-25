import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';
import { PatientLabLink } from '../patient-lab-links/schemas/patient-lab-link.schema';
import { TenantContext } from '../tenant-context/tenant-context.service';
import { PatientLabLinksService } from '../patient-lab-links/patient-lab-links.service';
import { normalizePhone } from '../common/utils/phone';
import { MetricsService } from '../common/metrics/metrics.service';

export interface SearchResult {
  status: 'in-lab' | 'cross-lab' | 'not-found';
  patient?: {
    _id: string;
    name: string;
    dateOfBirth?: Date | null;
    phone: string;
  };
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PatientLabLink.name) private linkModel: Model<PatientLabLink>,
    private tenant: TenantContext,
    private links: PatientLabLinksService,
    private metrics: MetricsService,
  ) {}

  async searchByPhone(phone: string): Promise<SearchResult> {
    if (!this.tenant.labId) throw new ForbiddenException('No lab context');
    const normalized = normalizePhone(phone);
    const patient = await this.userModel
      .findOne({ phone: normalized, role: UserRole.Patient })
      .lean()
      .exec();
    if (!patient) return { status: 'not-found' };

    const linked = await this.linkModel
      .countDocuments({
        patientId: patient._id,
        labId: new Types.ObjectId(this.tenant.labId),
      })
      .exec();

    return {
      status: linked > 0 ? 'in-lab' : 'cross-lab',
      patient: {
        _id: patient._id.toString(),
        name: patient.name,
        dateOfBirth: (patient as any).dateOfBirth ?? null,
        phone: patient.phone,
      },
    };
  }

  /**
   * Add new patient + link to current lab.
   *
   * Not transactional — the standalone Mongo dev setup doesn't support
   * multi-document transactions. Safety invariants still hold:
   *   - Duplicate-phone race is caught by the unique phone index, which
   *     returns E11000; we translate it into the same 409 + existing-patient
   *     payload the match dialog expects.
   *   - PatientLabLink is created via findOneAndUpdate(upsert) — idempotent.
   *   - Worst case (User saved, link write fails): we have an orphan User,
   *     which the next add-or-link call recovers via the 409 path.
   */
  async addAndLink(args: {
    name: string;
    phone: string;
    dateOfBirth: string;
    temporaryPassword: string;
  }): Promise<{ patient: User; isFirstLinkForLab: boolean }> {
    if (!this.tenant.labId) throw new ForbiddenException('No lab context');
    const labId = new Types.ObjectId(this.tenant.labId);
    const phone = normalizePhone(args.phone);

    // Pre-check (skips the most common case without hitting the unique index)
    const existing = await this.userModel.findOne({ phone }).exec();
    if (existing) {
      throw new ConflictException({
        message: 'Phone is already registered',
        existing: {
          _id: existing._id.toString(),
          name: existing.name,
          dateOfBirth: (existing as any).dateOfBirth ?? null,
          phone: existing.phone,
        },
      });
    }

    const hashed = await bcrypt.hash(args.temporaryPassword, 12);
    let created: User;
    try {
      const user = new this.userModel({
        name: args.name,
        phone,
        password: hashed,
        forcePasswordChange: true,
        role: UserRole.Patient,
        status: EntityStatus.Active,
        labId: null,
      });
      (user as any).dateOfBirth = new Date(args.dateOfBirth);
      created = await user.save();
    } catch (err: any) {
      // Concurrent insert won the race — surface the now-existing patient
      if (err?.code === 11000) {
        const winner = await this.userModel.findOne({ phone }).exec();
        if (winner) {
          throw new ConflictException({
            message: 'Phone is already registered',
            existing: {
              _id: winner._id.toString(),
              name: winner.name,
              dateOfBirth: (winner as any).dateOfBirth ?? null,
              phone: winner.phone,
            },
          });
        }
      }
      throw err;
    }

    await this.linkModel
      .findOneAndUpdate(
        { patientId: created._id, labId },
        {
          $setOnInsert: {
            patientId: created._id,
            labId,
            linkedByAdminId: this.tenant.userId
              ? new Types.ObjectId(this.tenant.userId)
              : undefined,
            linkedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    this.metrics.increment('patients.created', { labId: this.tenant.labId });
    this.metrics.increment('patients.linked', { labId: this.tenant.labId });
    return { patient: created, isFirstLinkForLab: true };
  }

  async getDetailForCurrentLab(patientId: string): Promise<any> {
    if (!this.tenant.labId) throw new ForbiddenException('No lab context');
    const linked = await this.linkModel
      .findOne({
        patientId: new Types.ObjectId(patientId),
        labId: new Types.ObjectId(this.tenant.labId),
      })
      .lean()
      .exec();
    if (!linked) throw new NotFoundException(`Patient ${patientId} not in lab`);
    const patient = await this.userModel.findById(patientId).lean().exec();
    if (!patient) throw new NotFoundException();
    return {
      _id: patient._id.toString(),
      name: patient.name,
      phone: patient.phone,
      dateOfBirth: (patient as any).dateOfBirth ?? null,
      visitingSince: linked.linkedAt,
    };
  }

  /** Used by tenant-isolation E2E + match-dialog confirmation. */
  async findById(patientId: string): Promise<User | null> {
    return this.userModel.findById(patientId).lean().exec() as any;
  }
}
