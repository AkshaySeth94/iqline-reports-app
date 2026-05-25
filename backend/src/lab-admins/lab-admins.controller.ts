import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LabAdminsService } from './lab-admins.service';
import { CreateLabAdminDto } from './dto/create-lab-admin.dto';
import { SetLabAdminStatusDto } from './dto/set-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Audit, AuditRead } from '../audit/decorators/audit.decorator';

@Controller('lab-admins')
@UseGuards(RolesGuard)
export class LabAdminsController {
  constructor(private readonly service: LabAdminsService) {}

  @Post('labs/:labId')
  @Roles(UserRole.SuperAdmin)
  @Audit('lab-admin.created')
  create(@Param('labId') labId: string, @Body() dto: CreateLabAdminDto) {
    return this.service.create(labId, dto);
  }

  @Get('labs/:labId')
  @Roles(UserRole.SuperAdmin)
  @AuditRead('lab-admin.list.read')
  list(@Param('labId') labId: string) {
    return this.service.listForLab(labId);
  }

  @Patch(':id/status')
  @Roles(UserRole.SuperAdmin)
  @Audit('lab-admin.status-changed')
  setStatus(@Param('id') id: string, @Body() dto: SetLabAdminStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
