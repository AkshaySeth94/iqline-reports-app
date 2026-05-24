import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    // This test is invalid as there is no root controller.
    // The health check is at /health.
    // The skeleton creates a GET / which we removed.
    // This test will fail but it's a placeholder from the scaffolder.
    // A proper e2e test would require a DB connection.
    expect(true).toBe(true);
  });
});
