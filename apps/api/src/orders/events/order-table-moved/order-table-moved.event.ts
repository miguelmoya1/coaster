import { BarId, Order, TableId } from '@coaster/common';

export class OrderTableMovedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
    public readonly oldTableId: TableId | null,
    public readonly newTableId: TableId,
  ) {}
}
