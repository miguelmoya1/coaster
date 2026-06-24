import type { BarId, ProductId } from '@coaster/common';
import { UpdateProductStockDto } from '../../dto/update-product-stock.dto';

export class UpdateProductStockCommand {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
    public readonly dto: UpdateProductStockDto,
  ) {}
}
