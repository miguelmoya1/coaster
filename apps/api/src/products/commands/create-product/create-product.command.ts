import { BarId, CreateProductDto } from '@coaster/common';

export class CreateProductCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateProductDto,
  ) {}
}
