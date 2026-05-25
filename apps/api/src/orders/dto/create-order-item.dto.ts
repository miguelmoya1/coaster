import * as Coaster from '@coaster/common';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto implements Coaster.CreateOrderItemDto {
  @IsUUID('4', { message: Coaster.ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: Coaster.ErrorCodes.REQUIRED })
  declare productId: Coaster.ProductId;

  @IsInt({ message: Coaster.ErrorCodes.INVALID_TYPE })
  @Min(1, { message: Coaster.ErrorCodes.INVALID_TYPE })
  @IsNotEmpty({ message: Coaster.ErrorCodes.REQUIRED })
  declare quantity: number;
}
