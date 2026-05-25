import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('prefixes +91 to a 10-digit Indian number', () => {
    expect(normalizePhone('9999942496')).toBe('+919999942496');
  });

  it('preserves an already-international number', () => {
    expect(normalizePhone('+14155551212')).toBe('+14155551212');
  });

  it('strips non-digits from an internationally-formatted number', () => {
    expect(normalizePhone('+1 (415) 555-1212')).toBe('+14155551212');
  });

  it('preserves +91 when the user already typed the country code', () => {
    expect(normalizePhone('919999942496')).toBe('+919999942496');
  });

  it('trims whitespace', () => {
    expect(normalizePhone('  9999942496  ')).toBe('+919999942496');
  });

  it('handles unusual lengths by prefixing default country code', () => {
    // 11 digits without leading + falls through to default-prefix path
    expect(normalizePhone('12345678901')).toBe('+9112345678901');
  });

  it('returns falsy input unchanged', () => {
    expect(normalizePhone('')).toBe('');
  });
});
