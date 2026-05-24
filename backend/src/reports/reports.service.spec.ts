import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { getModelToken } from '@nestjs/mongoose';
import { Report } from './schemas/report.schema';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../common/enums/user-role.enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let model: Model<Report>;

  const mockReportModel = {
    new: jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ _id: 'newId', ...dto }),
    })),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(Report.name), useValue: mockReportModel },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    model = module.get<Model<Report>>(getModelToken(Report.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a report for an admin', async () => {
      const report = { _id: 'report1', patient: new Types.ObjectId() };
      mockReportModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(report) });
      const result = await service.findOne('report1', 'adminId', UserRole.Admin);
      expect(result).toEqual(report);
    });

    it('should return a report for the correct patient', async () => {
      const patientId = new Types.ObjectId();
      const report = { _id: 'report1', patient: patientId };
      mockReportModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(report) });
      const result = await service.findOne('report1', patientId.toString(), UserRole.Patient);
      expect(result).toEqual(report);
    });

    it('should throw ForbiddenException if a patient tries to access another patient report', async () => {
      const patientId1 = new Types.ObjectId();
      const patientId2 = new Types.ObjectId();
      const report = { _id: 'report1', patient: patientId1 };
      mockReportModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(report) });
      await expect(service.findOne('report1', patientId2.toString(), UserRole.Patient)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if report does not exist', async () => {
      mockReportModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findOne('report1', 'userId', UserRole.Patient)).rejects.toThrow(NotFoundException);
    });
  });
});
