import type { UpdateTableDto as IUpdateTableDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTableDto implements IUpdateTableDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare name?: string;
}
