import type { BarId, OrderAdjustmentId, OrderId } from '@coaster/common';

export class RemoveOrderAdjustmentCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly adjustmentId: OrderAdjustmentId,
  ) {}
}
