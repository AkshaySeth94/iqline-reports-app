import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JWT_V2_DEPLOY_TIMESTAMP } from '../auth.constants';

function makeStrategy() {
  const cs = { get: jest.fn().mockReturnValue('test-secret-32-chars-minimum-xxxxx') };
  return new JwtStrategy(cs as any);
}

describe('JwtStrategy.validate', () => {
  it('accepts a v2 payload and returns userId+role+labId+tokenVersion=2', async () => {
    const s = makeStrategy();
    const result = await s.validate({
      v: 2,
      sub: 'u1',
      phone: '+91...',
      role: 'LabAdmin',
      labId: 'lab-a',
      name: 'X',
      iat: Math.floor(Date.now() / 1000),
    });
    expect(result).toMatchObject({
      userId: 'u1',
      sub: 'u1',
      role: 'LabAdmin',
      labId: 'lab-a',
      tokenVersion: 2,
    });
  });

  it('accepts a v1 payload (no v field) inside the 24h grace window', async () => {
    const s = makeStrategy();
    // iat = now (within window since constant captured at module load)
    const result = await s.validate({
      sub: 'legacy',
      phone: '+91...',
      role: 'Admin',
      name: 'Legacy',
      iat: Math.floor(Date.now() / 1000),
    });
    expect(result.tokenVersion).toBe(1);
    expect(result.labId).toBe(null);
  });

  it('rejects v1 payload when deploy timestamp is older than 24h', async () => {
    const s = makeStrategy();
    // Force the deploy-timestamp constant to be >24h ago by manipulating its global.
    // We can't mutate the captured constant directly — but the strategy's check is
    // (Date.now() - JWT_V2_DEPLOY_TIMESTAMP <= 24h). If we mock Date.now to be far
    // in the future, the window closes.
    const realNow = Date.now;
    try {
      Date.now = () => JWT_V2_DEPLOY_TIMESTAMP + 25 * 60 * 60 * 1000;
      await expect(
        s.validate({
          sub: 'legacy',
          role: 'Admin',
          iat: Math.floor(JWT_V2_DEPLOY_TIMESTAMP / 1000),
        }),
      ).rejects.toThrow(UnauthorizedException);
    } finally {
      Date.now = realNow;
    }
  });

  it('rejects v1 payload with no iat at all', async () => {
    const s = makeStrategy();
    await expect(
      s.validate({ sub: 'legacy', role: 'Admin' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
