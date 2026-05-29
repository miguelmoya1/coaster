import { BarId, OrderId } from '@coaster/common';

export class GetOrderByIdQuery {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
  ) {}
}
