/**
 * Tenant isolation E2E (NFR-S7). Builds a Lab-A and Lab-B fixture, logs in as
 * LabAdmin A via OTP, and asserts every cross-tenant read of Lab B resources
 * returns 403/404 — never 200 with Lab B data.
 *
 * Requires MONGODB_URI pointing at a test database (cleared between runs).
 *
 * Skips if MONGODB_URI is unset.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AppModule } from '../src/app.module';
import { Reflector } from '@nestjs/core';
import request = require('supertest');
import { connect, Types, Connection } from 'mongoose';

const SKIP = !process.env.MONGODB_URI;

(SKIP ? describe.skip : describe)('Tenant isolation E2E', () => {
  let app: INestApplication;
  let connection: Connection;
  let labA: any, labB: any, adminA: any, patientA: any, patientB: any, reportA: any, reportB: any;
  let tokenA: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    await app.init();

    const mongoose = await connect(process.env.MONGODB_URI!);
    connection = mongoose.connection;
    await connection.dropDatabase();

    const labCol = connection.collection('labs');
    const userCol = connection.collection('users');
    const reportCol = connection.collection('reports');
    const linkCol = connection.collection('patientlablinks');

    const now = new Date();
    const aId = new Types.ObjectId();
    const bId = new Types.ObjectId();
    await labCol.insertMany([
      { _id: aId, name: 'Lab A', licenseNumber: 'LIC-A', status: 'Active', createdAt: now, updatedAt: now },
      { _id: bId, name: 'Lab B', licenseNumber: 'LIC-B', status: 'Active', createdAt: now, updatedAt: now },
    ]);
    labA = { _id: aId };
    labB = { _id: bId };

    const adminAId = new Types.ObjectId();
    const adminBId = new Types.ObjectId();
    await userCol.insertMany([
      { _id: adminAId, name: 'Admin A', phone: '+911111111111', role: 'LabAdmin', status: 'Active', labId: aId, createdAt: now, updatedAt: now },
      { _id: adminBId, name: 'Admin B', phone: '+912222222222', role: 'LabAdmin', status: 'Active', labId: bId, createdAt: now, updatedAt: now },
    ]);

    const pAId = new Types.ObjectId();
    const pBId = new Types.ObjectId();
    await userCol.insertMany([
      { _id: pAId, name: 'Patient A', phone: '+913333333333', role: 'Patient', status: 'Active', labId: null, createdAt: now, updatedAt: now },
      { _id: pBId, name: 'Patient B', phone: '+914444444444', role: 'Patient', status: 'Active', labId: null, createdAt: now, updatedAt: now },
    ]);
    patientA = { _id: pAId };
    patientB = { _id: pBId };

    await linkCol.insertMany([
      { patientId: pAId, labId: aId, linkedAt: now, createdAt: now, updatedAt: now },
      { patientId: pBId, labId: bId, linkedAt: now, createdAt: now, updatedAt: now },
    ]);

    const rA = new Types.ObjectId();
    const rB = new Types.ObjectId();
    await reportCol.insertMany([
      { _id: rA, patient: pAId, labId: aId, reportDate: now, status: 'Final', reportType: 'glucose', data: { glucoseValue: 100 }, mealContext: 'Random', unit: 'mg/dL', createdBy: adminAId, updatedBy: adminAId, deletedAt: null, createdAt: now, updatedAt: now },
      { _id: rB, patient: pBId, labId: bId, reportDate: now, status: 'Final', reportType: 'glucose', data: { glucoseValue: 200 }, mealContext: 'Random', unit: 'mg/dL', createdBy: adminBId, updatedBy: adminBId, deletedAt: null, createdAt: now, updatedAt: now },
    ]);
    reportA = { _id: rA };
    reportB = { _id: rB };

    // Log in via OTP as Admin A
    const requestOtpRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ phone: '+911111111111' });
    expect(requestOtpRes.status).toBe(200);
    expect(requestOtpRes.body.role).toBe('LabAdmin');
    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+911111111111', otp: '123456' });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.role).toBe('LabAdmin');
    tokenA = verifyRes.body.accessToken;
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (connection) await connection.close();
  });

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${tokenA}`);
  const patch = (path: string, body: any) =>
    request(app.getHttpServer())
      .patch(path)
      .set('Authorization', `Bearer ${tokenA}`)
      .send(body);
  const del = (path: string) =>
    request(app.getHttpServer()).delete(path).set('Authorization', `Bearer ${tokenA}`);

  it('login resolves the role from the phone (Patient phone → Patient JWT)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+913333333333', otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('Patient');
  });

  it('Lab A admin can list its own patients only', async () => {
    const res = await get('/api/v1/patients/lab');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].patientId).toBe(patientA._id.toString());
  });

  it('Lab A admin gets 404 reading Lab B report by id', async () => {
    const res = await get(`/api/v1/reports/${reportB._id}`);
    expect([403, 404]).toContain(res.status);
  });

  it('Lab A admin gets 403/404 PATCHing Lab B report', async () => {
    const res = await patch(`/api/v1/reports/${reportB._id}`, { glucoseValue: 999, status: 'Corrected' });
    expect([403, 404]).toContain(res.status);
  });

  it('Lab A admin gets 403/404 DELETEing Lab B report', async () => {
    const res = await del(`/api/v1/reports/${reportB._id}`);
    expect([403, 404]).toContain(res.status);
  });

  it('Lab A admin listing reports for Lab B patient returns empty', async () => {
    const res = await get(`/api/v1/reports?patientId=${patientB._id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it('Lab A admin cannot get Lab B patient detail', async () => {
    const res = await get(`/api/v1/patients/${patientB._id}`);
    expect([403, 404]).toContain(res.status);
  });
});
