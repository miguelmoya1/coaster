import type { AddOrderAdjustmentDto, BarId, OrderId } from '@coaster/common';

export class AddOrderAdjustmentCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: AddOrderAdjustmentDto,
  ) {}
}
