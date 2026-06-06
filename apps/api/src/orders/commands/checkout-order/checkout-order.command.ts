import type { BarId, OrderId, PaymentMethod } from '@coaster/common';

export class CheckoutOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly paymentMethod: PaymentMethod,
  ) {}
}
