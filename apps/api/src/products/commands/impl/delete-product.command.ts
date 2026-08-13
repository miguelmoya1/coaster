import type { EstablishmentId, ProductId } from '@coaster/common';

export class DeleteProductCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly productId: ProductId,
  ) {}
}
