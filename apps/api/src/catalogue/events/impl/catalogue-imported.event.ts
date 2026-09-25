import type { EstablishmentId } from '@coaster/common';

export class CatalogueImportedEvent {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
