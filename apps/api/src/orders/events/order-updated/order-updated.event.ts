import type { BarId, Order } from '@coaster/common';

export class OrderUpdatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
  ) {}
}
