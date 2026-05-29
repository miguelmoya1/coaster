import { BarId, Order, OrderId, TableId } from '@coaster/common';

export class OrdersMergedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly primaryOrder: Order,
    public readonly sourceOrders: { id: OrderId; tableId: TableId | null }[],
  ) {}
}
