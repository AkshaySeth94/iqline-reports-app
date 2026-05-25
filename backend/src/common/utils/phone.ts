const DEFAULT_COUNTRY_CODE = '+91';

export function normalizePhone(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return digits.startsWith('+') ? digits : DEFAULT_COUNTRY_CODE + digits;
}
