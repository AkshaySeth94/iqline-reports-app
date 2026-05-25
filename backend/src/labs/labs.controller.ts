import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { SetLabStatusDto } from './dto/set-lab-status.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Audit, AuditRead } from '../audit/decorators/audit.decorator';
import { TenantContext } from '../tenant-context/tenant-context.service';

@Controller('labs')
@UseGuards(RolesGuard)
export class LabsController {
  constructor(
    private readonly service: LabsService,
    private readonly tenant: TenantContext,
  ) {}

  @Get('mine')
  @Roles(UserRole.LabAdmin, UserRole.Admin)
  @AuditRead('lab.mine.read')
  async mine() {
    if (!this.tenant.labId) {
      throw new ForbiddenException('Caller has no lab context');
    }
    return this.service.findByIdLean(this.tenant.labId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin)
  @Audit('lab.created')
  create(@Body() dto: CreateLabDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(UserRole.SuperAdmin)
  @AuditRead('lab.list.read')
  list(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({ search, cursor, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin)
  @AuditRead('lab.detail.read')
  detail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Patch(':id')
  @Roles(UserRole.SuperAdmin)
  @Audit('lab.updated')
  update(@Param('id') id: string, @Body() dto: UpdateLabDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SuperAdmin)
  @Audit('lab.status-changed')
  setStatus(@Param('id') id: string, @Body() dto: SetLabStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
