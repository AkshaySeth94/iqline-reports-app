/**
 * Seed a default password for any existing User without one. They'll be
 * forced to change it on first login (forcePasswordChange = true).
 *
 * Default temp password: "ChangeMe1!" (10 chars, letter + digit).
 *
 * Idempotent: re-runs are no-ops because passwordless users get fewer
 * with each run.
 */
const bcrypt = require('bcryptjs');

const DEFAULT_TEMP = 'ChangeMe1!';

module.exports = {
  async up(db) {
    const hash = await bcrypt.hash(DEFAULT_TEMP, 12);
    const result = await db.collection('users').updateMany(
      { $or: [{ password: { $exists: false } }, { password: null }] },
      { $set: { password: hash, forcePasswordChange: true } },
    );
    console.log(
      `[seed-default-password] seeded ${result.modifiedCount} user(s) with temp password "${DEFAULT_TEMP}" (they will be forced to change it on first login).`,
    );
  },

  async down(db) {
    // Best-effort: clear only the field. We can't know which users were
    // already password-less before this migration ran.
    await db
      .collection('users')
      .updateMany(
        { forcePasswordChange: true },
        { $unset: { password: '', forcePasswordChange: '' } },
      );
  },
};
