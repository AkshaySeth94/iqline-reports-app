import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperAdminMetricsService } from './super-admin-metrics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('super-admin/metrics')
@UseGuards(RolesGuard)
export class SuperAdminMetricsController {
  constructor(private readonly service: SuperAdminMetricsService) {}

  @Get('tiles')
  @Roles(UserRole.SuperAdmin)
  tiles() {
    return this.service.tiles();
  }
}
