import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportStatus } from '../common/enums/report-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

// Test IDs must be valid 24-char hex ObjectId strings — service constructs
// new Types.ObjectId(...) from these.
const LAB_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const LAB_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const USER_LAB = 'cccccccccccccccccccccccc';
const PATIENT = 'dddddddddddddddddddddddd';
const REPORT = 'eeeeeeeeeeeeeeeeeeeeeeee';
const OTHER_PATIENT = 'ffffffffffffffffffffffff';

function chain(result: any) {
  return {
    where: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

function makeService(opts: {
  isLinked?: boolean;
  labId?: string | null;
  userId?: string;
  role?: UserRole;
  countDocuments?: number;
} = {}) {
  const tenantContext = {
    userId: opts.userId ?? USER_LAB,
    role: opts.role ?? UserRole.LabAdmin,
    labId: opts.labId === undefined ? LAB_A : opts.labId,
    assertLabIdOf: jest.fn(),
  };
  const links = {
    isPatientLinkedToCurrentLab: jest.fn().mockResolvedValue(opts.isLinked ?? true),
  };
  const metrics = { increment: jest.fn() };
  const reportModel: any = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(opts.countDocuments ?? 0),
    }),
  };
  const labModel: any = { findById: jest.fn() };
  const service = new ReportsService(
    reportModel,
    labModel,
    tenantContext as any,
    links as any,
    metrics as any,
  );
  return { service, tenantContext, links, metrics, reportModel };
}

const finalReport = {
  _id: REPORT,
  patient: { toString: () => PATIENT },
  labId: { toString: () => LAB_A },
  status: ReportStatus.Final,
  data: { glucoseValue: 100 },
  mealContext: 'Random',
  unit: 'mg/dL',
  deletedAt: null,
};

describe('ReportsService.update', () => {
  it('rejects edit of a Final report when status not transitioning to Corrected', async () => {
    const { service, reportModel } = makeService();
    reportModel.findById.mockReturnValue(chain(finalReport));
    await expect(service.update(REPORT, { glucoseValue: 999 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('allows Final → Corrected single-op edit and stamps updatedBy', async () => {
    const { service, reportModel } = makeService();
    reportModel.findById.mockReturnValue(chain(finalReport));
    reportModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...finalReport, status: 'Corrected' }),
    });
    const updated = await service.update(REPORT, {
      glucoseValue: 120,
      status: ReportStatus.Corrected,
    });
    expect(updated.status).toBe('Corrected');
    const callArgs = reportModel.findByIdAndUpdate.mock.calls[0];
    expect(callArgs[0]).toBe(REPORT);
    expect(callArgs[1].status).toBe('Corrected');
    expect(callArgs[1].data.glucoseValue).toBe(120);
    expect(callArgs[1].updatedBy).toBeDefined();
  });

  it('allows editing an already-Corrected report', async () => {
    const { service, reportModel } = makeService();
    const corrected = { ...finalReport, status: ReportStatus.Corrected };
    reportModel.findById.mockReturnValue(chain(corrected));
    reportModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...corrected, data: { glucoseValue: 130 } }),
    });
    await expect(service.update(REPORT, { glucoseValue: 130 })).resolves.toBeDefined();
  });

  it('calls tenantContext.assertLabIdOf on the loaded report', async () => {
    const { service, reportModel, tenantContext } = makeService();
    reportModel.findById.mockReturnValue(chain(finalReport));
    reportModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...finalReport, status: 'Corrected' }),
    });
    await service.update(REPORT, { status: ReportStatus.Corrected });
    expect(tenantContext.assertLabIdOf).toHaveBeenCalledWith(finalReport, 'reports.update');
  });

  it('throws NotFound when report is missing or soft-deleted', async () => {
    const { service, reportModel } = makeService();
    reportModel.findById.mockReturnValue(chain(null));
    await expect(service.update('aaaaaaaaaaaaaaaaaaaaaaab', { notes: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('ReportsService.softDelete', () => {
  it('sets deletedAt + updatedBy via updateOne after asserting lab scope', async () => {
    const { service, reportModel, tenantContext } = makeService();
    reportModel.findById.mockReturnValue(chain(finalReport));
    await service.softDelete(REPORT, 'wrong patient');
    expect(tenantContext.assertLabIdOf).toHaveBeenCalledWith(finalReport, 'reports.softDelete');
    expect(reportModel.updateOne).toHaveBeenCalledWith(
      { _id: REPORT },
      expect.objectContaining({ deletedAt: expect.any(Date), updatedBy: expect.anything() }),
    );
  });

  it('throws NotFound on already-deleted report', async () => {
    const { service, reportModel } = makeService();
    reportModel.findById.mockReturnValue(chain(null));
    await expect(service.softDelete(REPORT)).rejects.toThrow(NotFoundException);
  });
});

describe('ReportsService.create', () => {
  it('rejects with Forbidden when patient is not linked to current lab (FR-303)', async () => {
    const { service } = makeService({ isLinked: false });
    await expect(
      service.create({
        patient: PATIENT,
        reportDate: new Date().toISOString(),
        glucoseValue: 100,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects with Forbidden when there is no lab context', async () => {
    const { service } = makeService({ labId: null });
    await expect(
      service.create({
        patient: PATIENT,
        reportDate: new Date().toISOString(),
        glucoseValue: 100,
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('ReportsService.findOne', () => {
  it('asserts lab scope when caller is LabAdmin', async () => {
    const { service, reportModel, tenantContext } = makeService();
    reportModel.findById.mockReturnValue(chain(finalReport));
    await service.findOne(REPORT);
    expect(tenantContext.assertLabIdOf).toHaveBeenCalledWith(finalReport, 'reports.findOne');
  });

  it('lets Patient access only their own reports', async () => {
    const { service, reportModel } = makeService({
      role: UserRole.Patient,
      userId: PATIENT,
      labId: null,
    });
    reportModel.findById.mockReturnValue(chain(finalReport));
    await expect(service.findOne(REPORT)).resolves.toBeDefined();
  });

  it("hides other patients' reports as NotFound for a Patient", async () => {
    const { service, reportModel } = makeService({
      role: UserRole.Patient,
      userId: OTHER_PATIENT,
      labId: null,
    });
    reportModel.findById.mockReturnValue(chain(finalReport));
    await expect(service.findOne(REPORT)).rejects.toThrow(NotFoundException);
  });
});
