import type { EstablishmentId, OrderId } from '@coaster/common';

export class DeleteOrderCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
  ) {}
}
