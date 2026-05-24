import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
