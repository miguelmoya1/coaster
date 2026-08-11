import type { EstablishmentId, ImportStarterCatalogueDto } from '@coaster/common';

export class ImportStarterCatalogueCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: ImportStarterCatalogueDto,
  ) {}
}
