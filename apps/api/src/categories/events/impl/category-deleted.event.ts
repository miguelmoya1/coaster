import type { EstablishmentId, CategoryId } from '@coaster/common';

export class CategoryDeletedEvent {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly categoryId: CategoryId,
  ) {}
}
