import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class BarCategories {
  readonly #categoryRepository = inject(CategoryRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#categoryRepository.routes.list(barId);
  }
}
