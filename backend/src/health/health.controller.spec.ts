import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { getConnectionToken } from '@nestjs/mongoose';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;

  const mockConnection = {
    readyState: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return { status: "ok" } when database is connected', () => {
    mockConnection.readyState = 1;
    expect(controller.check()).toEqual({ status: 'ok' });
  });

  it('should throw ServiceUnavailableException when database is not connected', () => {
    mockConnection.readyState = 0;
    expect(() => controller.check()).toThrow(ServiceUnavailableException);
  });
});
