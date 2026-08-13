import type { EstablishmentId } from '@coaster/common';
import { OrderStatus } from '@coaster/common';

export class GetOrdersByEstablishmentIdQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly status?: OrderStatus,
  ) {}
}
