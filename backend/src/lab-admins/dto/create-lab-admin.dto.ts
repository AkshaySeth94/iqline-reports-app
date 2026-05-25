import { IsString, MinLength, Matches } from 'class-validator';

export class CreateLabAdminDto {
  @IsString() @MinLength(2)
  name: string;

  @IsString() @MinLength(10)
  phone: string;

  /** Temp password the new admin will be forced to change on first login. */
  @IsString()
  @MinLength(10)
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a digit' })
  temporaryPassword: string;
}
