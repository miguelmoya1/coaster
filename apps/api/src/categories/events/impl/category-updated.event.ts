import type { EstablishmentId, Category } from '@coaster/common';

export class CategoryUpdatedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly category: Category,
  ) {}
}
