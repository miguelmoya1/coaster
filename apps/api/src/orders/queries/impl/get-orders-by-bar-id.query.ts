import type { BarId } from '@coaster/common';
import { OrderStatus } from '@coaster/common';

export class GetOrdersByBarIdQuery {
  constructor(
    public readonly barId: BarId,
    public readonly status?: OrderStatus,
  ) {}
}
