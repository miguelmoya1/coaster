import { type CategoryId, ErrorCodes, type UpdateProductDto as IUpdateProductDto } from '@coaster/common';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
}
