import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow access for public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should call super.canActivate for protected routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const canActivateSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockReturnValue(true);
    const context = {
      getHandler: () => {},
      getClass: () => {},
    } as unknown as ExecutionContext;

    guard.canActivate(context);
    expect(canActivateSpy).toHaveBeenCalledWith(context);
  });
});
