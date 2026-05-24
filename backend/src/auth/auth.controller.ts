import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PatientLoginDto } from './dto/patient-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from './decorators/public.decorator';
import { LoginResponseDto } from './dto/login-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Request() req: any): Promise<LoginResponseDto> {
    return this.authService.loginAdmin(req.user);
  }

  @Public()
  @Post('patient/login')
  @HttpCode(HttpStatus.OK)
  async patientLogin(
    @Body() patientLoginDto: PatientLoginDto,
  ): Promise<{ message: string }> {
    await this.authService.requestPatientOtp(patientLoginDto.phone);
    return { message: 'OTP request processed' };
  }

  @Public()
  @Post('patient/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<LoginResponseDto> {
    return this.authService.verifyPatientOtp(
      verifyOtpDto.phone,
      verifyOtpDto.otp,
    );
  }
}
