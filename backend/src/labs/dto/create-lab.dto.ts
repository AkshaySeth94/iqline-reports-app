import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LabAddressDto {
  @IsOptional() @IsString() line1?: string;
  @IsOptional() @IsString() line2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
}

export class CreateLabDto {
  @IsString() @MinLength(2)
  name: string;

  @IsString() @MinLength(2)
  licenseNumber: string;

  @IsOptional() @ValidateNested() @Type(() => LabAddressDto)
  address?: LabAddressDto;

  @IsOptional() @IsString() primaryContactName?: string;
  @IsOptional() @IsString() primaryContactPhone?: string;
  @IsOptional() @IsEmail() primaryContactEmail?: string;
}
