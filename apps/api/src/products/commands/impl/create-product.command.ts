import type { EstablishmentId } from '@coaster/common';
import { CreateProductDto } from '../../dto/create-product.dto';

export class CreateProductCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: CreateProductDto,
  ) {}
}
