import type { CheckoutOrderDto as ICheckoutOrderDto } from '@coaster/common';
import { PaymentMethod } from '@coaster/common';
import { IsIn, IsNotEmpty } from 'class-validator';
import { ErrorCodes } from '../../core';

export class CheckoutOrderDto implements ICheckoutOrderDto {
  @IsNotEmpty({ message: ErrorCodes.REQUIRED })
  @IsIn([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MIXED, PaymentMethod.NONE], {
    message: ErrorCodes.INVALID_TYPE,
  })
  declare paymentMethod: PaymentMethod;
}
