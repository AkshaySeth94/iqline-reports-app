import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';
import { CreatePatientDto } from './dto/create-patient.dto';
import { normalizePhone } from '../common/utils/phone';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * Create a patient. Used by LabAdmin "add new patient" flow (Epic 3)
   * and exposed as a thin legacy admin endpoint for migration parity.
   */
  async createPatient(
    dto: CreatePatientDto,
    opts: { dateOfBirth?: Date | string } = {},
  ): Promise<User> {
    const phone = normalizePhone(dto.phone);
    const existing = await this.userModel.findOne({ phone }).exec();
    if (existing) {
      throw new ConflictException({
        message: 'Phone number is already in use.',
        existing: {
          _id: existing._id,
          name: existing.name,
          dateOfBirth: (existing as any).dateOfBirth ?? null,
        },
      });
    }
    const created = new this.userModel({
      phone,
      name: dto.name,
      role: UserRole.Patient,
      status: EntityStatus.Active,
      labId: null,
      ...(opts.dateOfBirth ? { dateOfBirth: opts.dateOfBirth } : {}),
    });
    return created.save();
  }

  async findAllPatients(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.Patient }).exec();
  }

  async findByPhoneGlobal(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone: normalizePhone(phone) }).exec();
  }

  async findByIds(ids: Array<string | Types.ObjectId>): Promise<User[]> {
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }
}
