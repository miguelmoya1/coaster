import type { UpdateUserDto as IUpdateUserDto } from '@coaster/common';
import { IsOptional, IsString } from 'class-validator';
import { ErrorCodes } from '../../core';

export class UpdateUserDto implements IUpdateUserDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  name?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  photoUrl?: string;
}
