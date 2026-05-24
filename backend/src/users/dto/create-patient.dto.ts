import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  phone: string;
}
