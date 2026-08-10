import type { EstablishmentId, OrderId, UpdateOrderTipDto } from '@coaster/common';

export class UpdateOrderTipCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly dto: UpdateOrderTipDto,
  ) {}
}
