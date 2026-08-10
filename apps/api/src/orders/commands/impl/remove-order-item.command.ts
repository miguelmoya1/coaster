import type { EstablishmentId, OrderId, OrderItemId } from '@coaster/common';

export class RemoveOrderItemCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly itemId: OrderItemId,
  ) {}
}
