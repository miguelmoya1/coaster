import type { BarId, ProductId } from '@coaster/common';
import { UpdateProductDto } from '../../dto/update-product.dto';

export class UpdateProductCommand {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
    public readonly dto: UpdateProductDto,
  ) {}
}
