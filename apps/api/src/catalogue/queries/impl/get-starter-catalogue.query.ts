import type { EstablishmentId } from '@coaster/common';

export class GetStarterCatalogueQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
