import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { LabsModule } from './labs/labs.module';
import { LabAdminsModule } from './lab-admins/lab-admins.module';
import { PatientLabLinksModule } from './patient-lab-links/patient-lab-links.module';
import { PatientsModule } from './patients/patients.module';
import { SuperAdminMetricsModule } from './super-admin-metrics/super-admin-metrics.module';
import { TenantContextModule } from './tenant-context/tenant-context.module';
import { LabScopeInterceptor } from './tenant-context/lab-scope.interceptor';
import { ActiveStatusModule } from './active-status/active-status.module';
import { ActiveStatusGuard } from './active-status/active-status.guard';
import { MetricsModule } from './common/metrics/metrics.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { RequestContextMiddleware } from './common/logging/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (cs: ConfigService) => ({
        uri: cs.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      // Default: generous limit for authenticated endpoints
      { name: 'default', ttl: 60_000, limit: 100 },
      // Strict policy applied to auth endpoints via @Throttle decorator
      { name: 'auth', ttl: 5 * 60 * 1000, limit: 5 },
    ]),
    TenantContextModule,
    MetricsModule,
    AuditModule,
    ActiveStatusModule,
    AuthModule,
    UsersModule,
    LabsModule,
    LabAdminsModule,
    PatientLabLinksModule,
    PatientsModule,
    ReportsModule,
    SuperAdminMetricsModule,
    HealthModule,
  ],
  providers: [
    // Guard order: Jwt (via main.ts) → ActiveStatus → Throttler
    { provide: APP_GUARD, useClass: ActiveStatusGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Interceptor order: LabScope populates flags → AuditInterceptor records the action
    { provide: APP_INTERCEPTOR, useClass: LabScopeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
