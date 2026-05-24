import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportStatus } from '../../common/enums/report-status.enum';

class GlucoseMarkerDataDto {
  @IsNotEmpty()
  glucoseValue: number;
}

export class CreateReportDto {
  @IsMongoId()
  @IsNotEmpty()
  patient: string;

  @Type(() => Date)
  @IsDate()
  reportDate: Date;

  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(['GlucoseMarker'])
  reportType: 'GlucoseMarker';

  @ValidateNested()
  @Type(() => GlucoseMarkerDataDto)
  data: GlucoseMarkerDataDto;
}
