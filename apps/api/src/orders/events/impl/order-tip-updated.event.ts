import type { EstablishmentId, OrderId } from '@coaster/common';

export class OrderTipUpdatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly tipAmount: number,
  ) {}
}
