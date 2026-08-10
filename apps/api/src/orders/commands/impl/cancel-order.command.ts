import type { EstablishmentId, OrderId } from '@coaster/common';

export class CancelOrderCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
  ) {}
}
