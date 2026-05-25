/**
 * Orphan-check (NFR-D2). Every Report.patientId must reference a User,
 * every Report.labId must reference a Lab, and every PatientLabLink endpoint
 * must reference existing documents.
 */
import { MongoClient, Db } from 'mongodb';

const SKIP = !process.env.MONGODB_URI;

(SKIP ? describe.skip : describe)('Orphan check', () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    client = await MongoClient.connect(process.env.MONGODB_URI!);
    db = client.db();
  });
  afterAll(async () => await client.close());

  it('no orphan reports / links', async () => {
    const orphanReportsByLab = await db
      .collection('reports')
      .aggregate([
        { $lookup: { from: 'labs', localField: 'labId', foreignField: '_id', as: 'lab' } },
        { $match: { lab: { $size: 0 } } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    expect(orphanReportsByLab).toEqual([]);

    const orphanReportsByPatient = await db
      .collection('reports')
      .aggregate([
        { $lookup: { from: 'users', localField: 'patient', foreignField: '_id', as: 'p' } },
        { $match: { p: { $size: 0 } } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    expect(orphanReportsByPatient).toEqual([]);

    const orphanLinks = await db
      .collection('patientlablinks')
      .aggregate([
        { $lookup: { from: 'users', localField: 'patientId', foreignField: '_id', as: 'p' } },
        { $lookup: { from: 'labs', localField: 'labId', foreignField: '_id', as: 'l' } },
        { $match: { $or: [{ p: { $size: 0 } }, { l: { $size: 0 } }] } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    expect(orphanLinks).toEqual([]);
  });
});
