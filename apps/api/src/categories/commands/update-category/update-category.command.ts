import type { BarId, CategoryId, UpdateCategoryDto } from '@coaster/common';

export class UpdateCategoryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly categoryId: CategoryId,
    public readonly dto: UpdateCategoryDto,
  ) {}
}
