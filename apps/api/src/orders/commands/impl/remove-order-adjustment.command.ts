import type { EstablishmentId, OrderAdjustmentId, OrderId } from '@coaster/common';

export class RemoveOrderAdjustmentCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly adjustmentId: OrderAdjustmentId,
  ) {}
}
