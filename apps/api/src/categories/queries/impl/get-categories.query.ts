import type { EstablishmentId } from '@coaster/common';

export class GetCategoriesQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
