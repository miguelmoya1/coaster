import { BarId, Order } from '@coaster/common';

export class OrderItemsAddedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
  ) {}
}
