import type { EstablishmentId, OrderId } from '@coaster/common';
import { PaymentMethod } from '@coaster/common';

export class CheckoutOrderCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly paymentMethod: PaymentMethod,
  ) {}
}
