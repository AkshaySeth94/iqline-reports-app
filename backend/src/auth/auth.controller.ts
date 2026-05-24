import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { PatientLoginDto } from './dto/patient-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from './decorators/public.decorator';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() adminLoginDto: AdminLoginDto): Promise<LoginResponseDto> {
    throw new Error('not implemented');
  }

  @Public()
  @Post('patient/login')
  @HttpCode(HttpStatus.OK)
  patientLogin(
    @Body() patientLoginDto: PatientLoginDto,
  ): Promise<{ message: string }> {
    throw new Error('not implemented');
  }

  @Public()
  @Post('patient/verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<LoginResponseDto> {
    throw new Error('not implemented');
  }
}
