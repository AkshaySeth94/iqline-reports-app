import { InternalServerErrorException } from '@nestjs/common';
import { TenantContext } from './tenant-context.service';
import { TenantScopeViolation } from './tenant-scope-violation.error';
import { UserRole } from '../common/enums/user-role.enum';

function makeMetrics() {
  return { increment: jest.fn() };
}

/**
 * Each test runs its body INSIDE an ALS store so TenantContext.populate()
 * has somewhere to write — the assertion must happen in the same sync stack.
 */
function withTenant(
  { role, labId }: { role: UserRole; labId: string | null },
  fn: (tc: TenantContext, metrics: ReturnType<typeof makeMetrics>) => void,
) {
  const m = makeMetrics();
  const tc = new TenantContext(m as any);
  tc.als.run(
    { userId: null, role: null, labId: null, isCrossTenantRead: false },
    () => {
      tc.populate({ userId: 'u1', role, labId });
      fn(tc, m);
    },
  );
}

describe('TenantContext.assertLabIdOf', () => {
  it('passes when every doc.labId matches tenant.labId', () => {
    withTenant({ role: UserRole.LabAdmin, labId: 'lab-a' }, (tc, m) => {
      const docs = [{ labId: { toString: () => 'lab-a' } }, { labId: { toString: () => 'lab-a' } }];
      expect(() => tc.assertLabIdOf(docs, 'test')).not.toThrow();
      expect(m.increment).not.toHaveBeenCalled();
    });
  });

  it('throws TenantScopeViolation and emits metric on a single offending doc', () => {
    withTenant({ role: UserRole.LabAdmin, labId: 'lab-a' }, (tc, m) => {
      const docs = [
        { labId: { toString: () => 'lab-a' } },
        { labId: { toString: () => 'lab-b' } },
      ];
      expect(() => tc.assertLabIdOf(docs, 'reports.find')).toThrow(TenantScopeViolation);
      expect(m.increment).toHaveBeenCalledWith('tenant-scope-assertion.failure', {
        resource: 'reports.find',
        expected: 'lab-a',
        actual: 'lab-b',
      });
    });
  });

  it('treats null doc.labId as a violation', () => {
    withTenant({ role: UserRole.LabAdmin, labId: 'lab-a' }, (tc, m) => {
      expect(() => tc.assertLabIdOf({ labId: null }, 'x')).toThrow(TenantScopeViolation);
      expect(m.increment).toHaveBeenCalled();
    });
  });

  it('bypasses for SuperAdmin', () => {
    withTenant({ role: UserRole.SuperAdmin, labId: null }, (tc, m) => {
      const docs = [{ labId: { toString: () => 'lab-a' } }, { labId: { toString: () => 'lab-b' } }];
      expect(() => tc.assertLabIdOf(docs, 'cross-tenant')).not.toThrow();
      expect(m.increment).not.toHaveBeenCalled();
    });
  });

  it('throws InternalServerError when LabAdmin has no labId in context', () => {
    withTenant({ role: UserRole.LabAdmin, labId: null }, (tc, m) => {
      expect(() => tc.assertLabIdOf([{ labId: { toString: () => 'lab-a' } }], 'r')).toThrow(
        InternalServerErrorException,
      );
      expect(m.increment).toHaveBeenCalledWith('tenant-scope-assertion.failure', {
        resource: 'r',
        reason: 'no-tenant',
      });
    });
  });

  it('handles null/undefined documents as no-op', () => {
    withTenant({ role: UserRole.LabAdmin, labId: 'lab-a' }, (tc) => {
      expect(() => tc.assertLabIdOf(null)).not.toThrow();
      expect(() => tc.assertLabIdOf(undefined)).not.toThrow();
    });
  });

  it('accepts a single document (not an array)', () => {
    withTenant({ role: UserRole.LabAdmin, labId: 'lab-a' }, (tc) => {
      expect(() => tc.assertLabIdOf({ labId: { toString: () => 'lab-a' } })).not.toThrow();
    });
  });
});
