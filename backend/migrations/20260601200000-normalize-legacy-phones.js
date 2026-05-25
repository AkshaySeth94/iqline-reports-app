/**
 * Normalize any User phone that isn't already in E.164-ish "+<country><digits>"
 * form. The application normalizes phones on insert/lookup, but legacy data
 * created before that policy stored raw 10-digit numbers — those records
 * become unreachable via login until rewritten.
 *
 * Policy mirrors backend/src/common/utils/phone.ts:
 *   - phones starting with `+` → strip non-digits but keep the leading `+`
 *   - 10-digit Indian numbers → prefix `+91`
 *   - 12-digit starting with 91 → prefix `+`
 *   - everything else → prefix `+91`
 *
 * Idempotent: re-running won't change already-normalized phones.
 */
const DEFAULT_COUNTRY_CODE = '+91';

function normalize(raw) {
  if (!raw) return raw;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return DEFAULT_COUNTRY_CODE + digits;
}

module.exports = {
  async up(db) {
    const cursor = db.collection('users').find(
      { phone: { $not: /^\+/ } },
      { projection: { phone: 1 } },
    );
    let count = 0;
    let skipped = 0;
    while (await cursor.hasNext()) {
      const u = await cursor.next();
      const normalized = normalize(u.phone);
      if (normalized === u.phone) continue;
      // Guard against a collision with an already-normalized record
      const collision = await db
        .collection('users')
        .findOne({ _id: { $ne: u._id }, phone: normalized });
      if (collision) {
        console.warn(
          `[normalize-legacy-phones] SKIP _id=${u._id} phone="${u.phone}" → "${normalized}" collides with _id=${collision._id}`,
        );
        skipped++;
        continue;
      }
      await db
        .collection('users')
        .updateOne({ _id: u._id }, { $set: { phone: normalized } });
      count++;
    }
    console.log(
      `[normalize-legacy-phones] normalized ${count} user(s), skipped ${skipped} collision(s)`,
    );
  },

  async down() {
    // Intentional no-op: we can't safely reverse a normalize.
  },
};
