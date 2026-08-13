import type { EstablishmentId, OrderAdjustment, OrderId } from '@coaster/common';

export class OrderAdjustmentsUpdatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly adjustments: OrderAdjustment[],
  ) {}
}
