import type { BarId, Order, TableId } from '@coaster/common';

export class OrderCancelledEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
    public readonly tableId: TableId | null,
  ) {}
}
