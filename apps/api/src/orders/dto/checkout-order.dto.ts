import type * as Coaster from '@coaster/common';
import { ErrorCodes } from '../../core';
import { IsIn, IsNotEmpty } from 'class-validator';

export class CheckoutOrderDto implements Coaster.CheckoutOrderDto {
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @IsIn(['CASH', 'CARD', 'MIXED', 'NONE'], { message: ErrorCodes.INVALID_TYPE })
  declare paymentMethod: Coaster.PaymentMethod;
}
