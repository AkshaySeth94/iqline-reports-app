import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { initSentry, captureException } from './common/sentry/sentry.init';

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.enableCors();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  process.on('unhandledRejection', (err) => {
    captureException(err);
    Logger.error('unhandledRejection', err as any);
  });
  process.on('uncaughtException', (err) => {
    captureException(err);
    Logger.error('uncaughtException', err);
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
