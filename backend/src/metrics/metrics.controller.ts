import { Controller, Get, Res } from '@nestjs/common';
import { register, collectDefaultMetrics } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';

@Controller('metrics')
export class MetricsController {
  constructor() {
    collectDefaultMetrics();
  }

  @Public()
  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
