import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  check(): { status: string } {
    const isConnected = this.connection.readyState === 1;
    if (isConnected) {
      return { status: 'ok' };
    } else {
      throw new ServiceUnavailableException('Database not connected');
    }
  }
}
