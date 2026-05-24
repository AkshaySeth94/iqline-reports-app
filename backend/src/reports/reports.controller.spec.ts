import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportStatus } from '../common/enums/report-status.enum';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    create: jest.fn(),
    findAllForPatient: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call reportsService.create with correct parameters', async () => {
      const dto: CreateReportDto = {
        patient: 'patientId',
        reportDate: new Date(),
        status: ReportStatus.Final,
        reportType: 'GlucoseMarker',
        data: { glucoseValue: 100 },
      };
      const req = { user: { userId: 'adminId' } };
      await controller.create(dto, req);
      expect(service.create).toHaveBeenCalledWith(dto, 'adminId');
    });
  });

  describe('findAllForPatient', () => {
    it('should call reportsService.findAllForPatient with correct patientId', async () => {
      const req = { user: { userId: 'patientId' } };
      await controller.findAllForPatient(req);
      expect(service.findAllForPatient).toHaveBeenCalledWith('patientId');
    });
  });

  describe('findOne', () => {
    it('should call reportsService.findOne with correct parameters', async () => {
      const req = { user: { userId: 'userId', role: UserRole.Patient } };
      const reportId = 'reportId';
      await controller.findOne(reportId, req);
      expect(service.findOne).toHaveBeenCalledWith(reportId, 'userId', UserRole.Patient);
    });
  });
});
