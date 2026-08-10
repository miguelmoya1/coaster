import type { EstablishmentId, ProductId } from '@coaster/common';
import { UpdateProductStockDto } from '../../dto/update-product-stock.dto';

export class UpdateProductStockCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly productId: ProductId,
    public readonly dto: UpdateProductStockDto,
  ) {}
}
