import type { BarId } from '@coaster/common';
import { CreateProductDto } from '../../dto/create-product.dto';

export class CreateProductCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateProductDto,
  ) {}
}
