import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog } from './schemas/audit-log.schema';
import { Model } from 'mongoose';

describe('AuditService', () => {
  let service: AuditService;
  let model: Model<AuditLog>;

  const mockAuditLogModel = {
    new: jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(dto),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken(AuditLog.name),
          useValue: mockAuditLogModel,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    model = module.get<Model<AuditLog>>(getModelToken(AuditLog.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save a new audit log', async () => {
      const actorId = 'user123';
      const action = 'TEST_ACTION';
      const details = { info: 'test details' };

      const result = await service.log(actorId, action, details);

      expect(mockAuditLogModel.new).toHaveBeenCalledWith({
        actorId,
        action,
        details,
      });
      expect(result.save).toHaveBeenCalled();
    });
  });
});
