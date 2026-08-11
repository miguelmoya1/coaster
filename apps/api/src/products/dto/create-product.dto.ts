import type { Allergen, CategoryId, CreateProductDto as ICreateProductDto } from '@coaster/common';
import { ALLERGENS, ErrorCodes } from '@coaster/common';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductDto implements ICreateProductDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare name: string;

  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare categoryId: CategoryId;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare price?: number;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare currentStock?: number;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
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
