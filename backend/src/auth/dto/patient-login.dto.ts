import { IsNotEmpty, IsString, Length } from 'class-validator';

export class PatientLoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  phone: string;
}
