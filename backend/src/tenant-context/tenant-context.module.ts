import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant-context.service';
import { LabScopeInterceptor } from './lab-scope.interceptor';

@Global()
@Module({
  providers: [TenantContext, LabScopeInterceptor],
  exports: [TenantContext, LabScopeInterceptor],
})
export class TenantContextModule {}
