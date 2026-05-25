import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { register } from 'prom-client';
import { Response } from 'express';

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    register.clear(); // Clear metrics before each test
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return prometheus metrics', async () => {
      const mockResponse = {
        set: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.getMetrics(mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith(
        'Content-Type',
        register.contentType,
      );
      expect(mockResponse.end).toHaveBeenCalled();
      const metrics = (mockResponse.end as jest.Mock).mock.calls[0][0];
      expect(metrics).toContain('process_cpu_user_seconds_total');
    });
  });
});
