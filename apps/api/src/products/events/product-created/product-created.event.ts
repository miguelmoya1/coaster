import { BarId, Product } from '@coaster/common';

export class ProductCreatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly product: Product,
  ) {}
}
