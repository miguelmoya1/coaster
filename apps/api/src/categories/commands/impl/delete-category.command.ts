import type { EstablishmentId, CategoryId } from '@coaster/common';

export class DeleteCategoryCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly categoryId: CategoryId,
  ) {}
}
