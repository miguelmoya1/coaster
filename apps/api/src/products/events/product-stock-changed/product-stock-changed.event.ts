import { BarId, Product } from '@coaster/common';

export class ProductStockChangedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly product: Product,
  ) {}
}
