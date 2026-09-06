import type { EstablishmentId, OrderId, UpdateOrderNotesDto } from '@coaster/common';

export class UpdateOrderNotesCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly dto: UpdateOrderNotesDto,
  ) {}
}
