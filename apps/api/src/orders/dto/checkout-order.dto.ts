import type { CheckoutOrderDto as ICheckoutOrderDto, PaymentMethod } from '@coaster/common';
import { IsIn, IsNotEmpty } from 'class-validator';
import { ErrorCodes } from '../../core';

export class CheckoutOrderDto implements ICheckoutOrderDto {
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @IsIn(['CASH', 'CARD', 'MIXED', 'NONE'], { message: ErrorCodes.INVALID_TYPE })
  declare paymentMethod: PaymentMethod;
}
