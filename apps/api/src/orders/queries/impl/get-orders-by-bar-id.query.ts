import type { BarId, OrderStatus } from '@coaster/common';

export class GetOrdersByBarIdQuery {
  constructor(
    public readonly barId: BarId,
    public readonly status?: OrderStatus,
  ) {}
}
