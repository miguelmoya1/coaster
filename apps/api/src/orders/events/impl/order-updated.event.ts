import type { EstablishmentId, Order } from '@coaster/common';

export class OrderUpdatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly order: Order,
  ) {}
}
