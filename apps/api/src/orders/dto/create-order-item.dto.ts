import type * as Coaster from '@coaster/common';
import { ErrorCodes } from '../../core';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto implements Coaster.CreateOrderItemDto {
  @IsUUID('4', { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare productId: Coaster.ProductId;

  @IsInt({ message: ErrorCodes.INVALID_TYPE })
  @Min(1, { message: ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  declare quantity: number;
}
