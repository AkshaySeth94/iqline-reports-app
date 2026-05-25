import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { UserRole } from '../common/enums/user-role.enum';

// Valid 24-char hex ObjectId strings (service constructs new Types.ObjectId)
const LAB_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const USER_LAB = 'cccccccccccccccccccccccc';
const PATIENT = 'dddddddddddddddddddddddd';
const EXISTING_PATIENT = '111111111111111111111111';
const NOT_LINKED = '222222222222222222222222';

function makeService(opts: {
  labId?: string | null;
  userId?: string;
  linkExists?: boolean;
} = {}) {
  const tenantContext: any = {
    userId: opts.userId ?? USER_LAB,
    role: UserRole.LabAdmin,
    labId: opts.labId === undefined ? LAB_A : opts.labId,
  };

  const userModel: any = jest.fn().mockImplementation((doc) => ({
    ...doc,
    _id: 'new-id',
    save: jest.fn().mockResolvedValue({ _id: 'new-id', ...doc }),
  }));
  userModel.findOne = jest.fn();
  userModel.findById = jest.fn();

  const linkModel: any = {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(opts.linkExists ? { linkedAt: new Date() } : null),
      }),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'link-1' }),
    }),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
  };

  const links = { link: jest.fn().mockResolvedValue({ _id: 'link-1' }) };
  const metrics = { increment: jest.fn() };

  const service = new PatientsService(
    userModel,
    linkModel,
    tenantContext,
    links as any,
    metrics as any,
  );
  return { service, userModel, linkModel, tenantContext, metrics };
}

describe('PatientsService.searchByPhone', () => {
  it('returns in-lab when patient is linked to current lab', async () => {
    const { service, userModel, linkModel } = makeService();
    userModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: PATIENT,
          name: 'Alice',
          phone: '+919999999999',
          role: UserRole.Patient,
        }),
      }),
    });
    linkModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    const result = await service.searchByPhone('9999999999');
    expect(result.status).toBe('in-lab');
    expect(result.patient?.name).toBe('Alice');
  });

  it('returns cross-lab when patient exists globally but not in this lab', async () => {
    const { service, userModel, linkModel } = makeService();
    userModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: PATIENT,
          name: 'Bob',
          phone: '+919999999999',
          role: UserRole.Patient,
        }),
      }),
    });
    linkModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    const result = await service.searchByPhone('9999999999');
    expect(result.status).toBe('cross-lab');
  });

  it('returns not-found when patient does not exist anywhere', async () => {
    const { service, userModel } = makeService();
    userModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    });
    const result = await service.searchByPhone('9999999999');
    expect(result.status).toBe('not-found');
    expect(result.patient).toBeUndefined();
  });

  it('throws Forbidden when no lab context', async () => {
    const { service } = makeService({ labId: null });
    await expect(service.searchByPhone('123')).rejects.toThrow(ForbiddenException);
  });
});

describe('PatientsService.addAndLink', () => {
  it('throws 409 with existing-patient payload when phone is already registered (race-safety)', async () => {
    const { service, userModel } = makeService();
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: { toString: () => EXISTING_PATIENT },
        name: 'Alice',
        dateOfBirth: new Date('1990-01-01'),
        phone: '+919999999999',
      }),
    });
    try {
      await service.addAndLink({
        name: 'New Person',
        phone: '9999999999',
        dateOfBirth: '2000-01-01',
        temporaryPassword: 'Temporary1!',
      });
      fail('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      const body = e.getResponse();
      expect(body.existing).toMatchObject({
        _id: EXISTING_PATIENT,
        name: 'Alice',
        phone: '+919999999999',
      });
    }
  });

  it('throws Forbidden when no lab context', async () => {
    const { service } = makeService({ labId: null });
    await expect(
      service.addAndLink({
        name: 'X',
        phone: '1',
        dateOfBirth: '2000-01-01',
        temporaryPassword: 'Temporary1!',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('PatientsService.getDetailForCurrentLab', () => {
  it('throws NotFound when patient is not linked to current lab', async () => {
    const { service } = makeService();
    await expect(service.getDetailForCurrentLab(NOT_LINKED)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns patient + visitingSince when linked', async () => {
    const { service, userModel, linkModel } = makeService();
    linkModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ linkedAt: new Date('2024-01-01') }),
      }),
    });
    userModel.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => PATIENT },
          name: 'A',
          phone: '+91...',
          dateOfBirth: new Date('1990-01-01'),
        }),
      }),
    });
    const detail = await service.getDetailForCurrentLab(PATIENT);
    expect(detail.name).toBe('A');
    expect(detail.visitingSince).toBeInstanceOf(Date);
  });
});
