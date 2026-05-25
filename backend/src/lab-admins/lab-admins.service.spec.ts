import { ConflictException, NotFoundException } from '@nestjs/common';
import { LabAdminsService } from './lab-admins.service';
import { UserRole } from '../common/enums/user-role.enum';
import { EntityStatus } from '../common/enums/status.enum';

function makeService(opts: { existing?: any | null } = {}) {
  const userModel: any = jest.fn().mockImplementation((doc) => ({
    ...doc,
    _id: 'la-new',
    save: jest.fn().mockResolvedValue({ _id: 'la-new', ...doc }),
  }));
  userModel.findOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(opts.existing ?? null),
  });
  userModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  });
  userModel.findOneAndUpdate = jest.fn();
  const service = new LabAdminsService(userModel);
  return { service, userModel };
}

describe('LabAdminsService.create', () => {
  it('throws 409 when phone already exists', async () => {
    const { service } = makeService({ existing: { _id: 'x', phone: '+919999000000' } });
    await expect(
      service.create('aaaaaaaaaaaaaaaaaaaaaaaa', {
        name: 'A',
        phone: '9999000000',
        temporaryPassword: 'Temporary1!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates with hashed temp password + forcePasswordChange=true', async () => {
    const { service, userModel } = makeService();
    const created = await service.create('aaaaaaaaaaaaaaaaaaaaaaaa', {
      name: 'New',
      phone: '9999000001',
      temporaryPassword: 'Temporary1!',
    });
    const ctorArg = userModel.mock.calls[0][0];
    expect(ctorArg).toMatchObject({
      role: UserRole.LabAdmin,
      status: EntityStatus.Active,
      name: 'New',
      phone: '+919999000001',
      forcePasswordChange: true,
    });
    expect(ctorArg.password).toBeDefined();
    expect(ctorArg.password).not.toBe('Temporary1!'); // hashed
    expect((created as any)._id).toBe('la-new');
  });
});

describe('LabAdminsService.setStatus', () => {
  it('throws NotFound when admin id does not match a LabAdmin', async () => {
    const { service, userModel } = makeService();
    userModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.setStatus('missing', EntityStatus.Disabled)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates status when found', async () => {
    const { service, userModel } = makeService();
    userModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'la1', status: EntityStatus.Disabled }),
    });
    const result = await service.setStatus('la1', EntityStatus.Disabled);
    expect((result as any).status).toBe(EntityStatus.Disabled);
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'la1', role: UserRole.LabAdmin },
      { status: EntityStatus.Disabled },
      { new: true },
    );
  });
});
