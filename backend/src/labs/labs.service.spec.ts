import { ConflictException, NotFoundException } from '@nestjs/common';
import { LabsService } from './labs.service';
import { EntityStatus } from '../common/enums/status.enum';

function makeService() {
  const labCtor: any = jest.fn().mockImplementation((doc) => ({
    ...doc,
    _id: 'lab-new',
    save: jest.fn().mockResolvedValue({ _id: 'lab-new', ...doc }),
  }));
  labCtor.findById = jest.fn();
  labCtor.findByIdAndUpdate = jest.fn();
  labCtor.find = jest.fn();

  const reportModel: any = {
    aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  const linkModel: any = {
    aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  const metrics = { increment: jest.fn() };
  const service = new LabsService(labCtor, reportModel, linkModel, metrics as any);
  return { service, labCtor, reportModel, linkModel, metrics };
}

describe('LabsService.create', () => {
  it('translates Mongo duplicate-key (E11000) into 409 Conflict', async () => {
    const { service, labCtor } = makeService();
    labCtor.mockImplementationOnce((doc: any) => ({
      ...doc,
      save: jest.fn().mockRejectedValue({ code: 11000 }),
    }));
    await expect(
      service.create({ name: 'Dup', licenseNumber: 'X' }),
    ).rejects.toThrow(ConflictException);
  });

  it('returns the saved lab on success', async () => {
    const { service } = makeService();
    const lab = await service.create({ name: 'New', licenseNumber: 'LIC' });
    expect(lab).toMatchObject({ name: 'New', status: EntityStatus.Active });
  });
});

describe('LabsService.setStatus', () => {
  it('emits labs.suspended metric only when status transitions to Suspended', async () => {
    const { service, labCtor, metrics } = makeService();
    labCtor.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'l1', status: EntityStatus.Suspended }),
    });
    await service.setStatus('l1', EntityStatus.Suspended);
    expect(metrics.increment).toHaveBeenCalledWith('labs.suspended', { labId: 'l1' });
  });

  it('does NOT emit the suspended metric when re-activating', async () => {
    const { service, labCtor, metrics } = makeService();
    labCtor.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'l1', status: EntityStatus.Active }),
    });
    await service.setStatus('l1', EntityStatus.Active);
    expect(metrics.increment).not.toHaveBeenCalled();
  });

  it('throws NotFound when lab id is missing', async () => {
    const { service, labCtor } = makeService();
    labCtor.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.setStatus('missing', EntityStatus.Suspended)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('LabsService.findById', () => {
  it('throws NotFound when lab does not exist', async () => {
    const { service, labCtor } = makeService();
    labCtor.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
