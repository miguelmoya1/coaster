import type { EstablishmentId, Product } from '@coaster/common';

export class ProductUpdatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly product: Product,
  ) {}
}
