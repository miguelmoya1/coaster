import type { BarId, Category } from '@coaster/common';

export class CategoryCreatedEvent {
  constructor(
    public readonly barId: BarId,
    public readonly category: Category,
  ) {}
}
