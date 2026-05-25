import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Lab } from '../labs/schemas/lab.schema';
import { EntityStatus } from '../common/enums/status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

/**
 * Runs after JwtAuthGuard. Verifies user.status === Active and (for
 * LabAdmins) lab.status === Active on every authenticated request.
 *
 * Refreshes req.user with DB-verified values; LabScopeInterceptor (a global
 * interceptor that runs immediately after guards) reads req.user and
 * populates the request-scoped TenantContext. Keeping TenantContext out of
 * the guard avoids cascading the guard into request scope, which breaks
 * Reflector resolution when registered via APP_GUARD.
 */
@Injectable()
export class ActiveStatusGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Lab.name) private labModel: Model<Lab>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // JwtAuthGuard rejection has already happened

    const userId = user.userId || user.sub;
    const dbUser = await this.userModel
      .findById(userId)
      .select('_id status role labId')
      .lean()
      .exec();

    if (!dbUser) throw new UnauthorizedException('User not found');
    const status = (dbUser as any).status;
    if (status && status !== EntityStatus.Active) {
      throw new UnauthorizedException('User is not active');
    }

    if (
      dbUser.role === UserRole.LabAdmin ||
      dbUser.role === UserRole.Admin
    ) {
      if (!dbUser.labId) {
        throw new UnauthorizedException('Lab admin has no lab assigned');
      }
      const lab = await this.labModel
        .findById(dbUser.labId)
        .select('_id status')
        .lean()
        .exec();
      if (!lab || lab.status !== EntityStatus.Active) {
        throw new UnauthorizedException('Lab is not active');
      }
    }

    req.user = {
      ...user,
      userId,
      role: dbUser.role,
      labId: dbUser.labId ? dbUser.labId.toString() : null,
    };
    return true;
  }
}
