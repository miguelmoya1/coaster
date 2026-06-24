import type { BarId, Product } from '@coaster/common';

export class ProductUpdatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly product: Product,
  ) {}
}
