import { UpdateProductStockDto as IUpdateProductStockDto } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateProductStockDto implements IUpdateProductStockDto {
  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare currentStock: number;

  @IsNumber({}, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare minStockAlert: number;
}
