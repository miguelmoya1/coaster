import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../domain/password';

export class TokenWithPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  declare token: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  declare password: string;
}
