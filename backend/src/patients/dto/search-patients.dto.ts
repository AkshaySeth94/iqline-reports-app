import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class SearchPatientsDto {
  @IsString()
  @MinLength(10)
  phone: string;
}

export class AddPatientDto {
  @IsString() @MinLength(2)
  name: string;

  @IsString() @MinLength(10)
  phone: string;

  @IsString()
  dateOfBirth: string;

  /** Temp password the patient will be forced to change on first login. */
  @IsString()
  @MinLength(10)
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit' })
  temporaryPassword: string;
}
