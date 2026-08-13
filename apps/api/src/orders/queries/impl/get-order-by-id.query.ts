import type { EstablishmentId, OrderId } from '@coaster/common';

export class GetOrderByIdQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
  ) {}
}
