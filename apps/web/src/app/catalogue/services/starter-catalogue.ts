import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { CatalogueRepository } from '../data-access/catalogue-repository';

@Service()
export class StarterCatalogue {
  readonly #repository = inject(CatalogueRepository);

  public execute(establishmentId: EstablishmentId | null) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#repository.routes.starter(establishmentId);
  }
}
