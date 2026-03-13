import {
  UpdateProductStatusDto as IUpdateProductStatusDto,
  ProductStatus,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateProductStatusDto implements IUpdateProductStatusDto {
  @IsEnum(ProductStatus, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  status: ProductStatus;
}
