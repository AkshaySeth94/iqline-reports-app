import {
  Injectable,
  OnModuleInit,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async onModuleInit(): Promise<void> {
    const adminExists = await this.userModel
      .findOne({ role: UserRole.Admin })
      .exec();
    if (!adminExists) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('Hello@123!', salt);

      await new this.userModel({
        phone: '9999942496',
        password: hashedPassword,
        role: UserRole.Admin,
        name: 'Default Admin',
      }).save();
      this.logger.log('Default admin user created.');
    }
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone }).select('+password').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async createPatient(createPatientDto: CreatePatientDto): Promise<User> {
    const { phone, name } = createPatientDto;
    const existingUser = await this.findByPhone(phone);
    if (existingUser) {
      throw new ConflictException('Phone number is already in use.');
    }

    const newUser = new this.userModel({
      phone,
      name,
      role: UserRole.Patient,
    });

    return newUser.save();
  }

  async findAllPatients(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.Patient }).exec();
  }
}
