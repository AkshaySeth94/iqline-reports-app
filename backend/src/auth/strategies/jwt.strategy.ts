import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JWT_V2_DEPLOY_TIMESTAMP } from '../auth.constants';

/**
 * JWT payload v2: { v: 2, sub, phone, role, labId, name, iat, exp }
 * v1 tokens (no v field, no labId) accepted in 24h grace window post-deploy.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly graceWindowMs = 24 * 60 * 60 * 1000;

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.v === 2) {
      return {
        userId: payload.sub,
        sub: payload.sub,
        phone: payload.phone,
        role: payload.role,
        labId: payload.labId ?? null,
        name: payload.name,
        tokenVersion: 2,
      };
    }
    // v1 grace window — accept v1 tokens iat within 24h of deploy time
    const iatMs = (payload.iat || 0) * 1000;
    const ageSinceDeploy = Date.now() - JWT_V2_DEPLOY_TIMESTAMP;
    if (ageSinceDeploy <= this.graceWindowMs && iatMs > 0) {
      return {
        userId: payload.sub,
        sub: payload.sub,
        phone: payload.phone,
        role: payload.role,
        labId: null,
        name: payload.name,
        tokenVersion: 1,
      };
    }
    this.logger.warn('Rejected v1 JWT past grace window');
    throw new UnauthorizedException(
      'Token format expired; please log in again',
    );
  }
}
