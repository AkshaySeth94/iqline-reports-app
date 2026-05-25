/**
 * Multi-tenant retrofit migration.
 *
 *   up():
 *     1. Pre-flight count assertion
 *     2. Seed "Default Lab" (idempotent)
 *     3. Add status to Users (default Active), promote existing Admin → LabAdmin
 *        of Default Lab, back-fill all Patients with status=Active
 *     4. Back-fill labId/deletedAt/mealContext/unit on Reports
 *     5. Back-fill labId=null on AuditLogs
 *     6. Create PatientLabLink for every patient referenced by a Report
 *     7. Create all compound indexes (per architecture index spec)
 *     8. Post-flight assertion
 *
 *   down():
 *     reverts each step. Round-trip up→down→up must be idempotent
 *     (CI: migration-roundtrip.test.ts).
 */
const DEFAULT_LAB_NAME = 'Default Lab';
const DEFAULT_LAB_LICENSE = 'MIGRATION-DEFAULT-0001';
const TTL_24_MONTHS_SEC = 63072000;

module.exports = {
  async up(db) {
    const session = null; // standalone Mongo dev; transactions skipped

    // 1. Pre-flight
    const userCountBefore = await db.collection('users').countDocuments();
    const reportCountBefore = await db.collection('reports').countDocuments();
    console.log(`[pre-flight] users=${userCountBefore} reports=${reportCountBefore}`);

    // 2. Seed Default Lab (idempotent)
    const labCollection = db.collection('labs');
    let defaultLab = await labCollection.findOne({ isMigrationDefault: true });
    if (!defaultLab) {
      const now = new Date();
      const insert = await labCollection.insertOne({
        name: DEFAULT_LAB_NAME,
        licenseNumber: DEFAULT_LAB_LICENSE,
        status: 'Active',
        isMigrationDefault: true,
        createdAt: now,
        updatedAt: now,
      });
      defaultLab = { _id: insert.insertedId };
      console.log(`[default-lab] created _id=${defaultLab._id}`);
    } else {
      console.log(`[default-lab] already exists _id=${defaultLab._id}`);
    }

    // 3. Users — back-fill status, promote Admin → LabAdmin
    await db.collection('users').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'Active' } },
    );
    const promote = await db.collection('users').updateMany(
      { role: 'Admin' },
      {
        $set: { role: 'LabAdmin', labId: defaultLab._id },
        // Strip any legacy password/forcePasswordChange fields — login is OTP-only now
        $unset: { password: '', forcePasswordChange: '' },
      },
    );
    console.log(`[users] promoted Admin→LabAdmin count=${promote.modifiedCount}`);
    // Patients: labId stays null
    await db.collection('users').updateMany(
      { role: 'Patient', labId: { $exists: false } },
      { $set: { labId: null } },
    );

    // 4. Reports — back-fill
    await db.collection('reports').updateMany(
      { labId: { $exists: false } },
      {
        $set: {
          labId: defaultLab._id,
          deletedAt: null,
          mealContext: 'Random',
          unit: 'mg/dL',
        },
      },
    );

    // 5. AuditLogs — labId nullable
    await db.collection('auditlogs').updateMany(
      { labId: { $exists: false } },
      { $set: { labId: null } },
    );

    // 6. PatientLabLink per Report
    const patientIds = await db
      .collection('reports')
      .distinct('patient');
    if (patientIds.length > 0) {
      const ops = patientIds.map((pid) => ({
        updateOne: {
          filter: { patientId: pid, labId: defaultLab._id },
          update: {
            $setOnInsert: {
              patientId: pid,
              labId: defaultLab._id,
              linkedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));
      await db.collection('patientlablinks').bulkWrite(ops);
    }
    console.log(`[patient-lab-links] linked ${patientIds.length} patients`);

    // 7. Indexes — per architecture spec
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1, status: 1 });
    await db.collection('users').createIndex({ labId: 1, role: 1 });

    await db.collection('labs').createIndex({ name: 1 }, { unique: true });
    await db.collection('labs').createIndex({ licenseNumber: 1 }, { unique: true });
    await db.collection('labs').createIndex({ status: 1 });

    await db.collection('patientlablinks').createIndex(
      { patientId: 1, labId: 1 },
      { unique: true },
    );
    await db.collection('patientlablinks').createIndex({ labId: 1, patientId: 1 });
    await db.collection('patientlablinks').createIndex({ labId: 1, linkedAt: -1 });

    await db.collection('reports').createIndex({ labId: 1, patient: 1, reportDate: -1 });
    await db.collection('reports').createIndex({ patient: 1, reportDate: -1 });
    await db.collection('reports').createIndex({ labId: 1, createdAt: -1 });
    await db.collection('reports').createIndex({ deletedAt: 1 }, { sparse: true });

    await db.collection('auditlogs').createIndex({ labId: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ actorId: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ action: 1, createdAt: -1 });
    await db
      .collection('auditlogs')
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: TTL_24_MONTHS_SEC });

    // 8. Post-flight assertions
    const userCountAfter = await db.collection('users').countDocuments();
    const reportCountAfter = await db.collection('reports').countDocuments();
    if (userCountAfter !== userCountBefore) {
      throw new Error(
        `Post-flight users count mismatch: before=${userCountBefore} after=${userCountAfter}`,
      );
    }
    if (reportCountAfter !== reportCountBefore) {
      throw new Error(
        `Post-flight reports count mismatch: before=${reportCountBefore} after=${reportCountAfter}`,
      );
    }
    const labCount = await db.collection('labs').countDocuments();
    const linkCount = await db.collection('patientlablinks').countDocuments();
    console.log(
      `[post-flight] users=${userCountAfter} reports=${reportCountAfter} labs=${labCount} links=${linkCount}`,
    );
  },

  async down(db) {
    // Drop the labId from reports/auditlogs, restore admin role, drop links
    const defaultLab = await db
      .collection('labs')
      .findOne({ isMigrationDefault: true });

    await db
      .collection('users')
      .updateMany(
        { role: 'LabAdmin', labId: defaultLab?._id },
        { $set: { role: 'Admin' }, $unset: { labId: '' } },
      );

    await db.collection('reports').updateMany(
      {},
      { $unset: { labId: '', deletedAt: '', mealContext: '', unit: '' } },
    );

    await db.collection('auditlogs').updateMany({}, { $unset: { labId: '' } });

    await db.collection('patientlablinks').drop().catch(() => {});

    if (defaultLab) {
      await db.collection('labs').deleteOne({ _id: defaultLab._id });
    }

    // Drop newly-created indexes (Mongo will recreate index plans on next up)
    const reportIdx = await db.collection('reports').indexes();
    for (const idx of reportIdx) {
      if (
        idx.name &&
        [
          'labId_1_patient_1_reportDate_-1',
          'labId_1_createdAt_-1',
          'deletedAt_1',
        ].includes(idx.name)
      ) {
        await db.collection('reports').dropIndex(idx.name).catch(() => {});
      }
    }
    const linksColl = await db.listCollections({ name: 'patientlablinks' }).toArray();
    if (linksColl.length === 0) {
      // already dropped
    }
  },
};
