import { BarId, OrderId } from '@coaster/common';

export class CancelOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
  ) {}
}
