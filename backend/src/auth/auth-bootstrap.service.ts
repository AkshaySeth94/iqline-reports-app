import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';
import { AuditWriteQueueService } from '../audit/audit-write-queue.service';
import { normalizePhone } from '../common/utils/phone';

const DEFAULT_FORBIDDEN_SECRETS = new Set([
  '',
  'changeme',
  'change-me',
  'secret',
  'jwtsecret',
  'jwt_secret',
  'default',
  'placeholder',
]);

const BCRYPT_COST = 12;

/**
 * Lifecycle service. On boot:
 *   - refuses to start in prod with weak JWT_SECRET / missing SUPERADMIN_PHONE
 *   - seeds a SuperAdmin (env-driven, or dev defaults)
 *   - flags any legacy User without a password — they cannot log in until
 *     a SuperAdmin/LabAdmin resets it
 */
@Injectable()
export class AuthBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthBootstrapService.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
    private auditQueue: AuditWriteQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.assertProdSafe();
    await this.bootstrapSuperAdmin();
  }

  private assertProdSafe(): void {
    const env = process.env.NODE_ENV;
    const secret = this.configService.get<string>('JWT_SECRET') || '';
    if (env === 'production') {
      if (
        !secret ||
        DEFAULT_FORBIDDEN_SECRETS.has(secret.toLowerCase()) ||
        secret.length < 32
      ) {
        this.logger.error(
          'JWT_SECRET must be set and ≥32 chars in production. Refusing to start.',
        );
        process.exit(1);
      }
      if (!process.env.SUPERADMIN_PHONE || !process.env.SUPERADMIN_PASSWORD) {
        this.logger.error(
          'SUPERADMIN_PHONE and SUPERADMIN_PASSWORD must both be set in production. Refusing to start.',
        );
        process.exit(1);
      }
    }
  }

  private async bootstrapSuperAdmin(): Promise<void> {
    let phone = process.env.SUPERADMIN_PHONE;
    let password = process.env.SUPERADMIN_PASSWORD;
    const isProd = process.env.NODE_ENV === 'production';
    if ((!phone || !password) && !isProd) {
      phone = phone || '9999999999';
      password = password || 'SuperAdmin1!';
      this.logger.warn(
        `SuperAdmin env vars unset in dev — using defaults (phone=${phone} password=${password}). Override with SUPERADMIN_PHONE / SUPERADMIN_PASSWORD.`,
      );
    }
    if (!phone || !password) return;

    const normalized = normalizePhone(phone);
    const existing = await this.userModel
      .findOne({ phone: normalized })
      .select('+password')
      .exec();

    if (existing) {
      if (existing.role !== UserRole.SuperAdmin) {
        this.logger.warn(
          `Phone ${normalized} already exists with role ${existing.role}; not promoting to SuperAdmin.`,
        );
        return;
      }
      // Sync the SuperAdmin's password from env on each boot WHEN it's
      // unset or carries the migration's temp-password flag. We don't
      // overwrite a real, user-set password (no forcePasswordChange flag).
      if (!existing.password || existing.forcePasswordChange) {
        const hashed = await bcrypt.hash(password, BCRYPT_COST);
        await this.userModel
          .updateOne(
            { _id: existing._id },
            { $set: { password: hashed, forcePasswordChange: false } },
          )
          .exec();
        this.logger.log(
          `SuperAdmin ${normalized} password synced from env / dev default.`,
        );
      }
      return;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_COST);
    const created = await new this.userModel({
      name: process.env.SUPERADMIN_NAME || 'Platform Admin',
      phone: normalized,
      password: hashed,
      role: UserRole.SuperAdmin,
      status: EntityStatus.Active,
      labId: null,
    }).save();
    this.auditQueue.enqueue({
      actorId: created._id.toString(),
      action: 'super-admin.bootstrapped',
      details: { phone: normalized },
    });
    this.logger.log(`SuperAdmin bootstrapped: ${normalized}`);
  }
}
