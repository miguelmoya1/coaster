import { CategoryId, UpdateProductDto as IUpdateProductDto } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class UpdateProductDto implements IUpdateProductDto {
  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare name?: string;

  @IsString({ message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare categoryId?: CategoryId;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @Min(0, { message: ErrorCodes.INVALID_TYPE })
  @IsOptional()
  declare minStockAlert?: number;
}
