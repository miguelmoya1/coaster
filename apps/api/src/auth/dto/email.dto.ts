import { IsEmail } from 'class-validator';

export class EmailDto {
  @IsEmail()
  declare email: string;
}
