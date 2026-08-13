import type { EstablishmentId, OrderId } from '@coaster/common';

export class OrderDeletedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
  ) {}
}
