import type { EstablishmentId } from '@coaster/common';

export class GetOrdersByDateQuery {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly date: string,
  ) {}
}
