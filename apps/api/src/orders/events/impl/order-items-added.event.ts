import type { EstablishmentId, Order, ProductId } from '@coaster/common';

export class OrderItemsAddedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly order: Order,
    public readonly addedItems: { productId: ProductId; quantity: number }[],
  ) {}
}
