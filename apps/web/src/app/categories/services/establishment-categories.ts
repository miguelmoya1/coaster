import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class EstablishmentCategories {
  readonly #categoryRepository = inject(CategoryRepository);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#categoryRepository.routes.list(establishmentId);
  }
}
