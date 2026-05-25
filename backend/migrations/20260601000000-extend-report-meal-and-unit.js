/**
 * Defensive back-fill for mealContext + unit on Reports.
 * The first migration already sets these — this migration exists to satisfy
 * Story 4.1's "extend Report schema via migrate-mongo migration" requirement
 * cleanly and to handle reports inserted by the application code BEFORE the
 * defaults landed in the schema.
 */
module.exports = {
  async up(db) {
    await db.collection('reports').updateMany(
      { mealContext: { $exists: false } },
      { $set: { mealContext: 'Random' } },
    );
    await db.collection('reports').updateMany(
      { unit: { $exists: false } },
      { $set: { unit: 'mg/dL' } },
    );
  },
  async down(db) {
    await db.collection('reports').updateMany(
      {},
      { $unset: { mealContext: '', unit: '' } },
    );
  },
};
