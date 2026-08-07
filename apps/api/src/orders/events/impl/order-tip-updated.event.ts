import type { BarId, OrderId } from '@coaster/common';

export class OrderTipUpdatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly tipAmount: number,
  ) {}
}
