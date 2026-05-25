import { BarId, CreateCategoryDto } from '@coaster/common';

export class CreateCategoryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateCategoryDto,
  ) {}
}
