import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../domain/password';

export class RegisterDto {
  @IsEmail()
  declare email: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  declare password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  declare name: string;

  @IsOptional()
  @IsString()
  @Length(2, 5)
  declare language?: string;
}
