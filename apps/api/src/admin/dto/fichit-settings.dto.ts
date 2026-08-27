import { IsString, Matches, MinLength } from 'class-validator';

export class FichitSettingsDto {
  @Matches(/^https?:\/\/\S+$/, { message: 'apiUrl debe ser una URL http o https' })
  apiUrl!: string;

  @IsString()
  @MinLength(20)
  apiKey!: string;
}
