import type { BarId, ProductId } from '@coaster/common';

export class AdjustProductStockCommand {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
    public readonly delta: number,
  ) {}
}
