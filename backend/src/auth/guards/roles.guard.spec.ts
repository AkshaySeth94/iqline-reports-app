import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.Admin]);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: UserRole.Admin },
        }),
      }),
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.Admin]);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: UserRole.Patient },
        }),
      }),
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(false);
  });
});
