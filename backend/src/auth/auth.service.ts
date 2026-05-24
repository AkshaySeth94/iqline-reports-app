import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { User } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async validateAdmin(
    phone: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByPhone(phone);

    if (
      user &&
      user.role === UserRole.Admin &&
      user.password &&
      (await bcrypt.compare(pass, user.password))
    ) {
      const { password, ...result } = user.toObject();
      return result;
    }
    await this.auditService.log('system', 'LOGIN_FAILURE', {
      phone,
      reason: 'Invalid credentials',
      roleAttempted: UserRole.Admin,
    });
    return null;
  }

  async loginAdmin(user: any): Promise<LoginResponseDto> {
    const payload = { phone: user.phone, sub: user._id, role: user.role };
    await this.auditService.log(user._id.toString(), 'LOGIN_SUCCESS', {
      role: UserRole.Admin,
    });
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '1h' }),
    };
  }

  async requestPatientOtp(phone: string): Promise<void> {
    const patient = await this.usersService.findByPhone(phone);
    if (!patient || patient.role !== UserRole.Patient) {
      throw new NotFoundException('Phone number not found');
    }
    // Per PRD, no actual OTP is sent in v1. We just validate the user exists.
  }

  async verifyPatientOtp(phone: string, otp: string): Promise<LoginResponseDto> {
    if (otp !== '123456') {
      await this.auditService.log('system', 'LOGIN_FAILURE', {
        phone,
        reason: 'Invalid OTP',
        roleAttempted: UserRole.Patient,
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    const patient = await this.usersService.findByPhone(phone);
    if (!patient || patient.role !== UserRole.Patient) {
      await this.auditService.log('system', 'LOGIN_FAILURE', {
        phone,
        reason: 'Phone number not found after OTP validation',
        roleAttempted: UserRole.Patient,
      });
      throw new NotFoundException('Phone number not found');
    }

    const payload = {
      phone: patient.phone,
      sub: patient._id.toString(),
      role: patient.role,
    };
    await this.auditService.log(patient._id.toString(), 'LOGIN_SUCCESS', {
      role: UserRole.Patient,
    });
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '24h' }),
    };
  }
}
