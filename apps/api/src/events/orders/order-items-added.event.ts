import type { BarId, Order, ProductId } from '@coaster/common';

export class OrderItemsAddedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
    public readonly addedItems: { productId: ProductId; quantity: number }[],
  ) {}
}
