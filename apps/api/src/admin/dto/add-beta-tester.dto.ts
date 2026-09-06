import type { AddBetaTesterDto as IAddBetaTesterDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddBetaTesterDto implements IAddBetaTesterDto {
  @IsEmail({}, { message: ErrorCodes.INVALID_EMAIL })
  @MaxLength(320, { message: ErrorCodes.MAX_LENGTH })
  email!: string;

  @IsOptional()
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @MaxLength(200, { message: ErrorCodes.MAX_LENGTH })
  note?: string;
}
