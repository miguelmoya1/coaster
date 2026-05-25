import { BarId, ProductId, UpdateProductDto } from '@coaster/common';

export class UpdateProductCommand {
  constructor(
    public readonly barId: BarId,
    public readonly productId: ProductId,
    public readonly dto: UpdateProductDto,
  ) {}
}
