import type { BarId, ProductId, UpdateProductStockDto } from '@coaster/common';

export class UpdateProductStockCommand {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
    public readonly dto: UpdateProductStockDto,
  ) {}
}
