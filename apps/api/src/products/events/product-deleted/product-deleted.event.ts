import { BarId, ProductId } from '@coaster/common';

export class ProductDeletedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
  ) {}
}
