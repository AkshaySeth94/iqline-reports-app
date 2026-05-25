import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';

function makeGuard(requiredRoles: UserRole[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as any as Reflector;
  return new RolesGuard(reflector);
}

function ctx(user: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  it('allows when no required roles are specified', () => {
    const g = makeGuard(undefined);
    expect(g.canActivate(ctx({ role: UserRole.Patient }))).toBe(true);
  });

  it('allows when user role matches one of the required roles', () => {
    const g = makeGuard([UserRole.SuperAdmin, UserRole.LabAdmin]);
    expect(g.canActivate(ctx({ role: UserRole.LabAdmin }))).toBe(true);
  });

  it('denies when user role is not in the required list', () => {
    const g = makeGuard([UserRole.SuperAdmin]);
    expect(g.canActivate(ctx({ role: UserRole.Patient }))).toBe(false);
  });

  it('denies when user is missing', () => {
    const g = makeGuard([UserRole.SuperAdmin]);
    expect(g.canActivate(ctx(undefined))).toBe(false);
  });
});
