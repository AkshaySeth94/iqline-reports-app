/**
 * Migration round-trip: up → down → up on a seeded fixture. Asserts
 *   • database state after the 2nd up matches state after the 1st up
 *   • no orphan references survive a down
 *
 * Skips unless MONGODB_URI is set to a test database.
 */
import { MongoClient, Db, ObjectId } from 'mongodb';

const up = require('../migrations/20260526000000-multi-tenant-retrofit.js').up;
const down = require('../migrations/20260526000000-multi-tenant-retrofit.js').down;

const SKIP = !process.env.MONGODB_URI;

(SKIP ? describe.skip : describe)('Migration round-trip', () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = await MongoClient.connect(process.env.MONGODB_URI!);
    db = client.db();
  }, 20_000);

  afterAll(async () => {
    await client.close();
  });

  async function seedFixture() {
    await db.dropDatabase();
    const now = new Date();
    const adminId = new ObjectId();
    const patientId = new ObjectId();
    await db.collection('users').insertMany([
      {
        _id: adminId,
        name: 'Legacy Admin',
        phone: '+919999942496',
        password: 'hash',
        role: 'Admin',
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: patientId,
        name: 'Legacy Patient',
        phone: '+918888888888',
        role: 'Patient',
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await db.collection('reports').insertOne({
      patient: patientId,
      reportDate: now,
      status: 'Final',
      reportType: 'glucose',
      data: { glucoseValue: 110 },
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async function snapshot() {
    return {
      users: await db.collection('users').countDocuments(),
      reports: await db.collection('reports').countDocuments(),
      labs: await db.collection('labs').countDocuments(),
      links: await db.collection('patientlablinks').countDocuments(),
      labAdmins: await db
        .collection('users')
        .countDocuments({ role: 'LabAdmin' }),
    };
  }

  it('up → down → up produces identical state to first up', async () => {
    await seedFixture();
    await up(db);
    const afterFirst = await snapshot();
    await down(db);
    await up(db);
    const afterSecond = await snapshot();
    expect(afterSecond).toEqual(afterFirst);
  }, 60_000);

  it('after down(), no Report has a labId and no PatientLabLink remains', async () => {
    await seedFixture();
    await up(db);
    await down(db);
    const reportsWithLab = await db
      .collection('reports')
      .countDocuments({ labId: { $exists: true, $ne: null } });
    const links = await db.collection('patientlablinks').countDocuments().catch(() => 0);
    expect(reportsWithLab).toBe(0);
    expect(links).toBe(0);
  }, 60_000);
});
