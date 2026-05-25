import { IsOptional, IsString, MinLength, IsDateString } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
