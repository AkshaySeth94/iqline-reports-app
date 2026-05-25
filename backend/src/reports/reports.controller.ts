import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Audit, AuditRead } from '../audit/decorators/audit.decorator';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @Roles(UserRole.LabAdmin)
  @Audit('report.created')
  create(@Body() dto: CreateReportDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(UserRole.LabAdmin)
  @AuditRead('reports.list.read')
  listForPatient(@Query('patientId') patientId: string) {
    return this.service.listForPatientThisLab(patientId);
  }

  @Get('me')
  @Roles(UserRole.Patient)
  @AuditRead('patient.reports.read')
  listForMe(@Request() req: any) {
    return this.service.listForPatientAggregated(req.user.userId);
  }

  @Get(':id')
  @Roles(UserRole.LabAdmin, UserRole.Patient)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.LabAdmin)
  @Audit('report.updated')
  update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.LabAdmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit('report.deleted')
  async remove(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<void> {
    await this.service.softDelete(id, reason);
  }
}
