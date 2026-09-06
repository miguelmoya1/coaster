import type { UpdateCategoryDto as IUpdateCategoryDto } from '@coaster/common';
import { ErrorCodes, MAX_TAX_RATE } from '@coaster/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCategoryDto implements IUpdateCategoryDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare icon?: string;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  @Max(MAX_TAX_RATE, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare taxRate?: number;
}
