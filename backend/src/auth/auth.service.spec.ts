import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';

/**
 * Builds a service with a mocked userModel that supports both
 * `findOne({phone}).select('+password').exec()` and `findById(id).select('+password').exec()`.
 */
function makeService(opts: { userByPhone?: any | null; userById?: any | null } = {}) {
  const usersService = { findByPhone: jest.fn() };
  const jwtService = { sign: jest.fn().mockReturnValue('fake.jwt.token') };
  const auditService = { log: jest.fn() };
  const metrics = { increment: jest.fn() };

  const userModel: any = {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(opts.userByPhone ?? null),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(opts.userById ?? null),
      }),
    }),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
  };

  const service = new AuthService(
    usersService as any,
    jwtService as any,
    auditService as any,
    metrics as any,
    userModel,
  );
  return { service, jwtService, auditService, metrics, userModel };
}

async function userWithPassword(plaintext: string, overrides: any = {}) {
  return {
    _id: { toString: () => 'u-test' },
    phone: '+919999999999',
    role: UserRole.LabAdmin,
    status: EntityStatus.Active,
    labId: { toString: () => 'lab-a' },
    name: 'Test User',
    forcePasswordChange: false,
    password: await bcrypt.hash(plaintext, 4),
    ...overrides,
  };
}

describe('AuthService.login', () => {
  it('issues a JWT v2 carrying role + labId on correct credentials', async () => {
    const user = await userWithPassword('CorrectHorse1');
    const { service, jwtService } = makeService({ userByPhone: user });
    const result = await service.login('9999999999', 'CorrectHorse1');
    expect(result.role).toBe(UserRole.LabAdmin);
    expect(result.forcePasswordChange).toBe(false);
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        v: 2,
        sub: 'u-test',
        role: UserRole.LabAdmin,
        labId: 'lab-a',
      }),
      { expiresIn: '1h' },
    );
  });

  it('surfaces forcePasswordChange=true so the client can route to /change-password', async () => {
    const user = await userWithPassword('TempPwd123!', { forcePasswordChange: true });
    const { service } = makeService({ userByPhone: user });
    const result = await service.login('9999999999', 'TempPwd123!');
    expect(result.forcePasswordChange).toBe(true);
  });

  it('throws 401 on wrong password and emits failure metric', async () => {
    const user = await userWithPassword('CorrectHorse1');
    const { service, metrics } = makeService({ userByPhone: user });
    await expect(service.login('9999999999', 'WrongPwd123')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(metrics.increment).toHaveBeenCalledWith('login.failure', {
      reason: 'invalid-password',
    });
  });

  it('throws 404 when phone is unknown', async () => {
    const { service, metrics } = makeService({ userByPhone: null });
    await expect(service.login('1234567890', 'any')).rejects.toThrow(NotFoundException);
    expect(metrics.increment).toHaveBeenCalledWith('login.failure', {
      reason: 'phone-not-found',
    });
  });

  it('throws 401 when user is not Active', async () => {
    const user = await userWithPassword('p', { status: EntityStatus.Disabled });
    const { service, metrics } = makeService({ userByPhone: user });
    await expect(service.login('9999999999', 'p')).rejects.toThrow(UnauthorizedException);
    expect(metrics.increment).toHaveBeenCalledWith('login.failure', {
      reason: 'user-not-active',
    });
  });

  it('throws 401 when user has no password set', async () => {
    const user = await userWithPassword('', {});
    delete user.password;
    const { service, metrics } = makeService({ userByPhone: user });
    await expect(service.login('9999999999', 'anything')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(metrics.increment).toHaveBeenCalledWith('login.failure', {
      reason: 'no-password-set',
    });
  });

  it('throws 401 when LabAdmin has no labId assigned', async () => {
    const user = await userWithPassword('Pwd123abcd', { labId: null });
    const { service } = makeService({ userByPhone: user });
    await expect(service.login('9999999999', 'Pwd123abcd')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('issues a 24h JWT for a Patient', async () => {
    const user = await userWithPassword('Pwd123abcd', {
      role: UserRole.Patient,
      labId: null,
    });
    const { service, jwtService } = makeService({ userByPhone: user });
    await service.login('9999999999', 'Pwd123abcd');
    expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
      expiresIn: '24h',
    });
  });
});

describe('AuthService.changePassword', () => {
  it('updates the password when the current one matches', async () => {
    const user = await userWithPassword('OldPassword1');
    const { service, userModel } = makeService({ userById: user });
    await service.changePassword('u-test', 'OldPassword1', 'NewPassword1');
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: 'u-test' },
      expect.objectContaining({
        $set: expect.objectContaining({ forcePasswordChange: false }),
      }),
    );
  });

  it('throws 401 when the current password is wrong', async () => {
    const user = await userWithPassword('OldPassword1');
    const { service } = makeService({ userById: user });
    await expect(
      service.changePassword('u-test', 'WrongOld', 'NewPassword1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('skips current-password check when forcePasswordChange flag is set', async () => {
    const user = await userWithPassword('TempPwd123', { forcePasswordChange: true });
    const { service, userModel } = makeService({ userById: user });
    await service.changePassword('u-test', null, 'NewPassword1');
    expect(userModel.updateOne).toHaveBeenCalled();
  });

  it('rejects new passwords that are too short', async () => {
    const user = await userWithPassword('OldPassword1');
    const { service } = makeService({ userById: user });
    await expect(
      service.changePassword('u-test', 'OldPassword1', 'short1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects new passwords missing letter or digit', async () => {
    const user = await userWithPassword('OldPassword1');
    const { service } = makeService({ userById: user });
    await expect(
      service.changePassword('u-test', 'OldPassword1', '!!!!!!!!!!'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when new password is the same as the current', async () => {
    const user = await userWithPassword('SameSame12');
    const { service } = makeService({ userById: user });
    await expect(
      service.changePassword('u-test', 'SameSame12', 'SameSame12'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('AuthService.acknowledgeTerms', () => {
  it('sets termsAcknowledgedAt only when null', async () => {
    const { service, userModel } = makeService();
    await service.acknowledgeTerms('u-pt');
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: 'u-pt', termsAcknowledgedAt: null },
      { $set: { termsAcknowledgedAt: expect.any(Date) } },
    );
  });
});
