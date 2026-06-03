import type { BarId, Order, TableId } from '@coaster/common';

export class OrderCreatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
    public readonly tableId: TableId | null,
  ) {}
}
