import type { BarId, OrderAdjustment, OrderId } from '@coaster/common';

export class OrderAdjustmentsUpdatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly adjustments: OrderAdjustment[],
  ) {}
}
