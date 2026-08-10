import type { EstablishmentId, Order, ProductId } from '@coaster/common';

export class OrderItemRemovedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly order: Order,
    public readonly removedItem: { productId: ProductId; quantity: number },
  ) {}
}
