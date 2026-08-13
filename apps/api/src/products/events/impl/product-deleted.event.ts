import type { EstablishmentId, ProductId } from '@coaster/common';

export class ProductDeletedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly productId: ProductId,
  ) {}
}
