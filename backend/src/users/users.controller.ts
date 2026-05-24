import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from './schemas/user.schema';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('patient')
  @Roles(UserRole.Admin)
  createPatient(@Body() createPatientDto: CreatePatientDto): Promise<User> {
    return this.usersService.createPatient(createPatientDto);
  }
}
