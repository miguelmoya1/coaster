import type { EstablishmentId, Order, TableId } from '@coaster/common';

export class OrderCreatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly order: Order,
    public readonly tableId: TableId | null,
  ) {}
}
