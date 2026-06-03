import type { BarId, OrderId } from '@coaster/common';

export class CheckoutOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
  ) {}
}
