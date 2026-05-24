import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcryptjs';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let auditService: AuditService;

  const mockUsersService = {
    findByPhone: jest.fn(),
  };
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test_token'),
  };
  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  describe('validateAdmin', () => {
    it('should return user data if credentials are valid', async () => {
      const mockAdmin = {
        phone: '9999942496',
        password: 'hashedPassword',
        role: UserRole.Admin,
        toObject: () => ({ password: 'hashedPassword' }),
      };
      mockUsersService.findByPhone.mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateAdmin('9999942496', 'password');
      expect(result).toBeDefined();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should return null for invalid credentials and log failure', async () => {
      mockUsersService.findByPhone.mockResolvedValue(null);
      const result = await service.validateAdmin('9999942496', 'wrongpassword');
      expect(result).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith('system', 'LOGIN_FAILURE', expect.any(Object));
    });
  });

  describe('verifyPatientOtp', () => {
    it('should return a token for a valid OTP and existing patient', async () => {
      const mockPatient = { _id: 'patient1', phone: '1234567890', role: UserRole.Patient };
      mockUsersService.findByPhone.mockResolvedValue(mockPatient);

      const result = await service.verifyPatientOtp('1234567890', '123456');
      expect(result).toEqual({ accessToken: 'test_token' });
      expect(auditService.log).toHaveBeenCalledWith(mockPatient._id, 'LOGIN_SUCCESS', expect.any(Object));
    });

    it('should throw UnauthorizedException for an invalid OTP and log failure', async () => {
      await expect(service.verifyPatientOtp('1234567890', '000000')).rejects.toThrow(UnauthorizedException);
      expect(auditService.log).toHaveBeenCalledWith('system', 'LOGIN_FAILURE', expect.any(Object));
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockUsersService.findByPhone.mockResolvedValue(null);
      await expect(service.verifyPatientOtp('1234567890', '123456')).rejects.toThrow(NotFoundException);
    });
  });
});
