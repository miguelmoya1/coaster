import { BarId, CategoryId } from '@coaster/common';

export class DeleteCategoryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly categoryId: CategoryId,
  ) {}
}
