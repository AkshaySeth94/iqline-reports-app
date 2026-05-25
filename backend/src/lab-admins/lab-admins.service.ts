import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';
import { CreateLabAdminDto } from './dto/create-lab-admin.dto';
import { normalizePhone } from '../common/utils/phone';

@Injectable()
export class LabAdminsService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(labId: string, dto: CreateLabAdminDto): Promise<User> {
    const phone = normalizePhone(dto.phone);
    const existing = await this.userModel.findOne({ phone }).exec();
    if (existing) {
      throw new ConflictException('Phone number is already in use.');
    }
    const hashed = await bcrypt.hash(dto.temporaryPassword, 12);
    const created = new this.userModel({
      name: dto.name,
      phone,
      password: hashed,
      forcePasswordChange: true,
      role: UserRole.LabAdmin,
      labId: new Types.ObjectId(labId),
      status: EntityStatus.Active,
    });
    return created.save();
  }

  async listForLab(labId: string): Promise<User[]> {
    return this.userModel
      .find({ labId: new Types.ObjectId(labId), role: UserRole.LabAdmin })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as any;
  }

  async setStatus(adminId: string, status: EntityStatus): Promise<User> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: adminId, role: UserRole.LabAdmin },
        { status },
        { new: true },
      )
      .exec();
    if (!user) throw new NotFoundException(`Lab admin ${adminId} not found`);
    return user;
  }
}
