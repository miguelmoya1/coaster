import type { EstablishmentId, OrderId, OrderItemId, UpdateOrderItemNotesDto } from '@coaster/common';

export class UpdateOrderItemNotesCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly itemId: OrderItemId,
    public readonly dto: UpdateOrderItemNotesDto,
  ) {}
}
