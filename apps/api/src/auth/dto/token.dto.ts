import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  declare token: string;
}
