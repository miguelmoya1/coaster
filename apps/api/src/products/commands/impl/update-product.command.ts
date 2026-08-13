import type { EstablishmentId, ProductId } from '@coaster/common';
import { UpdateProductDto } from '../../dto/update-product.dto';

export class UpdateProductCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly productId: ProductId,
    public readonly dto: UpdateProductDto,
  ) {}
}
