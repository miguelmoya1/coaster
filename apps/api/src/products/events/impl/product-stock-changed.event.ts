import type { EstablishmentId, Product } from '@coaster/common';

export class ProductStockChangedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly product: Product,
  ) {}
}
