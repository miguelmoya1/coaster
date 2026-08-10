import type { EstablishmentId, Product } from '@coaster/common';

export class ProductCreatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly product: Product,
  ) {}
}
