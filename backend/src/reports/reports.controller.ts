import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Report } from './schemas/report.schema';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles(UserRole.Admin)
  create(
    @Body() createReportDto: CreateReportDto,
    @Request() req: any,
  ): Promise<Report> {
    return this.reportsService.create(createReportDto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.Patient)
  findAllForPatient(@Request() req: any): Promise<Report[]> {
    return this.reportsService.findAllForPatient(req.user.userId);
  }

  @Get(':id')
  @Roles(UserRole.Admin, UserRole.Patient)
  findOne(@Param('id') id: string, @Request() req: any): Promise<Report> {
    return this.reportsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Request() req: any,
  ): Promise<Report> {
    return this.reportsService.update(id, updateReportDto, req.user.userId);
  }
}
