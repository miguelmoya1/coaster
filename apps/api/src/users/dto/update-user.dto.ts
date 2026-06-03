import type { UpdateUserDto as IUpdateUserDto } from '@coaster/common';
import { ErrorCodes } from '../../core';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto implements IUpdateUserDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare name?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare photoUrl?: string;
}
