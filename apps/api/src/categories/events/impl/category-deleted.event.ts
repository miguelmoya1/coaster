import type { BarId, CategoryId } from '@coaster/common';

export class CategoryDeletedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly categoryId: CategoryId,
  ) {}
}
