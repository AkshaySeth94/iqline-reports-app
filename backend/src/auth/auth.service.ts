import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { User } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { normalizePhone } from '../common/utils/phone';

const EXPIRES_BY_ROLE: Record<string, string> = {
  Patient: '24h',
  LabAdmin: '1h',
  Admin: '1h',
  SuperAdmin: '1h',
};

/** Password policy. Same rule as the LabAdmin/Patient create flows enforce. */
function validatePassword(pw: string): void {
  if (!pw || pw.length < 10) {
    throw new BadRequestException('Password must be at least 10 characters');
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    throw new BadRequestException(
      'Password must contain at least one letter and one digit',
    );
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private metrics: MetricsService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Single-step phone + password login. The phone uniquely determines the
   * user; bcrypt-compare against the stored hash. JWT carries role + labId.
   */
  async login(
    phone: string,
    password: string,
  ): Promise<LoginResponseDto & { role: UserRole; forcePasswordChange: boolean }> {
    const normalized = normalizePhone(phone);
    const user = await this.userModel
      .findOne({ phone: normalized })
      .select('+password')
      .exec();
    if (!user) {
      this.auditService.log('system', 'login.failure', {
        phone: normalized,
        reason: 'phone-not-found',
      });
      this.metrics.increment('login.failure', { reason: 'phone-not-found' });
      throw new NotFoundException('Phone number not found');
    }
    if (user.status !== EntityStatus.Active) {
      this.auditService.log('system', 'login.failure', {
        phone: normalized,
        reason: 'user-not-active',
      });
      this.metrics.increment('login.failure', { reason: 'user-not-active' });
      throw new UnauthorizedException('Account is not active');
    }
    if (!user.password) {
      this.auditService.log('system', 'login.failure', {
        phone: normalized,
        reason: 'no-password-set',
      });
      this.metrics.increment('login.failure', { reason: 'no-password-set' });
      throw new UnauthorizedException(
        'Password not set for this account — contact your admin',
      );
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      this.auditService.log('system', 'login.failure', {
        phone: normalized,
        reason: 'invalid-password',
      });
      this.metrics.increment('login.failure', { reason: 'invalid-password' });
      throw new UnauthorizedException('Invalid phone or password');
    }
    if (
      (user.role === UserRole.LabAdmin || user.role === UserRole.Admin) &&
      !user.labId
    ) {
      throw new UnauthorizedException('Lab admin has no lab assigned');
    }

    const payload = {
      v: 2,
      sub: user._id.toString(),
      phone: user.phone,
      role: user.role,
      labId: user.labId ? user.labId.toString() : null,
      name: user.name,
    };
    await this.userModel
      .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })
      .exec();
    this.auditService.log(payload.sub, 'login.success', { role: user.role });
    this.metrics.increment('login.success', { role: user.role });

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: EXPIRES_BY_ROLE[user.role] || '1h',
      }),
      role: user.role,
      forcePasswordChange: !!user.forcePasswordChange,
    };
  }

  /**
   * Self-service password change. Any authenticated user can call this for
   * their own account. Requires the current password — except when the
   * forcePasswordChange flag is set (admin-seeded / temp password), in
   * which case the current password check is skipped.
   */
  async changePassword(
    userId: string,
    currentPassword: string | null,
    newPassword: string,
  ): Promise<void> {
    validatePassword(newPassword);
    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();
    if (!user) throw new NotFoundException('User not found');

    if (!user.forcePasswordChange) {
      if (
        !currentPassword ||
        !user.password ||
        !(await bcrypt.compare(currentPassword, user.password))
      ) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }
    // if (user.password && (await bcrypt.compare(newPassword, user.password))) {
    //   throw new BadRequestException(
    //     'New password must differ from the current one',
    //   );
    // }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userModel
      .updateOne(
        { _id: userId },
        { $set: { password: hashed, forcePasswordChange: false } },
      )
      .exec();
    this.auditService.log(userId, 'auth.password-changed', {});
  }

  async acknowledgeTerms(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId, termsAcknowledgedAt: null },
        { $set: { termsAcknowledgedAt: new Date() } },
      )
      .exec();
  }
}
