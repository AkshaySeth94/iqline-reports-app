import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  Get,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { LoginResponseDto } from './dto/login-response.dto';
import { Audit } from '../audit/decorators/audit.decorator';

const AUTH_THROTTLE = { auth: { limit: 5, ttl: 5 * 60 * 1000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<LoginResponseDto & { role: string; forcePasswordChange: boolean }> {
    return this.authService.login(dto.phone, dto.password);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Audit('auth.password-changed')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req: any,
  ): Promise<{ ok: true }> {
    await this.authService.changePassword(
      req.user.userId,
      dto.currentPassword || null,
      dto.newPassword,
    );
    return { ok: true };
  }

  @Get('me')
  async me(@Request() req: any) {
    return {
      userId: req.user.userId,
      role: req.user.role,
      labId: req.user.labId ?? null,
      phone: req.user.phone,
      name: req.user.name,
    };
  }

  @Post('patient/terms-acknowledged')
  @HttpCode(HttpStatus.OK)
  @Audit('patient.terms-acknowledged')
  async ackTerms(@Request() req: any): Promise<{ ok: true }> {
    await this.authService.acknowledgeTerms(req.user.userId);
    return { ok: true };
  }
}
