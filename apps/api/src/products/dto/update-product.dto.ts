import type { Allergen, CategoryId, UpdateProductDto as IUpdateProductDto } from '@coaster/common';
import { ALLERGENS, ErrorCodes } from '@coaster/common';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto implements IUpdateProductDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare name?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare categoryId?: CategoryId;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare price?: number;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare minStockAlert?: number;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare imageUrl?: string;

  @IsArray({ message: ErrorCodes.INVALID_TYPE })
  @IsIn(ALLERGENS, { each: true, message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare allergens?: Allergen[];
}
