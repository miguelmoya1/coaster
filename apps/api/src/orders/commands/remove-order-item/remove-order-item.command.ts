import { BarId, OrderId, OrderItemId } from '@coaster/common';

export class RemoveOrderItemCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly itemId: OrderItemId,
  ) {}
}
