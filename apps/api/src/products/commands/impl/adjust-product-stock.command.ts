import type { EstablishmentId, ProductId } from '@coaster/common';

export class AdjustProductStockCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly productId: ProductId,
    public readonly delta: number,
  ) {}
}
