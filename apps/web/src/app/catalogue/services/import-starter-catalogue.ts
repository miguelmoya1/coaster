import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/core';
import { CatalogueRepository } from '../data-access/catalogue-repository';

@Service()
export class ImportStarterCatalogue {
  readonly #repository = inject(CatalogueRepository);

  public execute(establishmentId: EstablishmentId, categoryKeys?: string[]): Promise<void> {
    return this.#repository.import(establishmentId, categoryKeys);
  }
}
