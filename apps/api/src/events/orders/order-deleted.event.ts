import type { BarId, OrderId } from '@coaster/common';

export class OrderDeletedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
  ) {}
}
