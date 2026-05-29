import { BarId, OrderId } from '@coaster/common';

export class DeleteOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
  ) {}
}
