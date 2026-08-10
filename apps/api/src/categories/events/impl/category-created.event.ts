import type { EstablishmentId, Category } from '@coaster/common';

export class CategoryCreatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly category: Category,
  ) {}
}
