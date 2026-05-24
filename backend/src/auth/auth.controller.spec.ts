import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { PatientLoginDto } from './dto/patient-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    loginAdmin: jest.fn().mockResolvedValue({ accessToken: 'admin_token' }),
    requestPatientOtp: jest.fn().mockResolvedValue(undefined),
    verifyPatientOtp: jest.fn().mockResolvedValue({ accessToken: 'patient_token' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('adminLogin', () => {
    it('should call authService.loginAdmin and return an access token', async () => {
      const adminLoginDto: AdminLoginDto = { phone: '9999942496', password: 'password' };
      // Note: The controller doesn't call validateAdmin directly. It's handled by a guard not tested here.
      // The controller's job is to call loginAdmin with the user from the request.
      const mockUser = { id: '1', role: 'Admin' };
      const req = { user: mockUser };

      const result = await controller.adminLogin(req as any);
      expect(service.loginAdmin).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ accessToken: 'admin_token' });
    });
  });

  describe('patientLogin', () => {
    it('should call authService.requestPatientOtp', async () => {
      const patientLoginDto: PatientLoginDto = { phone: '1234567890' };
      const result = await controller.patientLogin(patientLoginDto);
      expect(service.requestPatientOtp).toHaveBeenCalledWith(patientLoginDto.phone);
      expect(result).toEqual({ message: 'OTP request processed' });
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyPatientOtp and return an access token', async () => {
      const verifyOtpDto: VerifyOtpDto = { phone: '1234567890', otp: '123456' };
      const result = await controller.verifyOtp(verifyOtpDto);
      expect(service.verifyPatientOtp).toHaveBeenCalledWith(verifyOtpDto.phone, verifyOtpDto.otp);
      expect(result).toEqual({ accessToken: 'patient_token' });
    });
  });
});
