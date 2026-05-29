import { BarId, ProductId } from '@coaster/common';

export class DeleteProductCommand {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
  ) {}
}
