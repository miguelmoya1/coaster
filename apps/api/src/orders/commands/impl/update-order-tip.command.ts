import type { BarId, OrderId, UpdateOrderTipDto } from '@coaster/common';

export class UpdateOrderTipCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: UpdateOrderTipDto,
  ) {}
}
