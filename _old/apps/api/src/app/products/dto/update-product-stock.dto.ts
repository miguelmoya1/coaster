import { UpdateProductStockDto as IUpdateProductStockDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/logic';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateProductStockDto implements IUpdateProductStockDto {
  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare currentStock: number;
}
