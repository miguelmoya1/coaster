import { BarId, Order, ProductId } from '@coaster/common';

export class OrderItemRemovedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly order: Order,
    public readonly removedItem: { productId: ProductId; quantity: number },
  ) {}
}
