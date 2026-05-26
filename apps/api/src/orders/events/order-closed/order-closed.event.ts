import { BarId, Order, TableId } from '@coaster/common';

export class OrderClosedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
    public readonly tableId: TableId | null,
  ) {}
}
