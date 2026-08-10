import type { EstablishmentId, Order, OrderId, TableId } from '@coaster/common';

export class OrdersMergedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly primaryOrder: Order,
    public readonly sourceOrders: { id: OrderId; tableId: TableId | null }[],
  ) {}
}
