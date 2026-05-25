import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReportStatus } from '../../common/enums/report-status.enum';
import { MealContext } from '../../common/enums/meal-context.enum';
import { GlucoseUnit } from '../../common/enums/glucose-unit.enum';

export class CreateReportDto {
  @IsMongoId()
  patient: string;

  @IsDateString()
  reportDate: string;

  @IsNumber()
  @Min(0.1)
  @Max(2000)
  glucoseValue: number;

  @IsOptional()
  @IsEnum(GlucoseUnit)
  unit?: GlucoseUnit;

  @IsOptional()
  @IsEnum(MealContext)
  mealContext?: MealContext;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
