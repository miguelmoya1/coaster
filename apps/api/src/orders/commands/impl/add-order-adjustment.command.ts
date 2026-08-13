import type { AddOrderAdjustmentDto, EstablishmentId, OrderId } from '@coaster/common';

export class AddOrderAdjustmentCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly dto: AddOrderAdjustmentDto,
  ) {}
}
