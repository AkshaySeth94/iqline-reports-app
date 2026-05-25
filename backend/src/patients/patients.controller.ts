import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientLabLinksService } from '../patient-lab-links/patient-lab-links.service';
import { AddPatientDto } from './dto/search-patients.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Audit, AuditRead } from '../audit/decorators/audit.decorator';

@Controller('patients')
@UseGuards(RolesGuard)
export class PatientsController {
  constructor(
    private readonly service: PatientsService,
    private readonly links: PatientLabLinksService,
  ) {}

  @Get('search')
  @Roles(UserRole.LabAdmin)
  @AuditRead('patient.search')
  search(@Query('phone') phone: string) {
    return this.service.searchByPhone(phone);
  }

  @Get('lab')
  @Roles(UserRole.LabAdmin)
  @AuditRead('patient-list.read')
  list(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.links.listPatientsForCurrentLab({
      search,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  @Roles(UserRole.LabAdmin)
  @Audit('patient.created')
  async addAndLink(@Body() dto: AddPatientDto) {
    return this.service.addAndLink(dto);
  }

  @Post(':id/link')
  @Roles(UserRole.LabAdmin)
  @Audit('patient.linked')
  @HttpCode(HttpStatus.OK)
  async link(@Param('id') id: string) {
    const link = await this.links.link(id);
    return { ok: true, link };
  }

  @Get(':id')
  @Roles(UserRole.LabAdmin)
  @AuditRead('patient.detail.read')
  detail(@Param('id') id: string) {
    return this.service.getDetailForCurrentLab(id);
  }

  /** Match-dialog confirmation read (impression audited). */
  @Get(':id/match-summary')
  @Roles(UserRole.LabAdmin)
  @AuditRead('patient-match.dialog')
  async matchSummary(@Param('id') id: string) {
    const p = await this.service.findById(id);
    if (!p) return null;
    return {
      _id: p._id.toString(),
      name: p.name,
      dateOfBirth: (p as any).dateOfBirth ?? null,
    };
  }
}
