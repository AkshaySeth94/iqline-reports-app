import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
