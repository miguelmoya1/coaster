import type { BarId, Category } from '@coaster/common';

export class CategoryUpdatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly category: Category,
  ) {}
}
