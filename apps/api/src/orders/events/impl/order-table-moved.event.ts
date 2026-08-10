import type { EstablishmentId, Order, TableId } from '@coaster/common';

export class OrderTableMovedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly order: Order,
    public readonly oldTableId: TableId | null,
    public readonly newTableId: TableId,
  ) {}
}
