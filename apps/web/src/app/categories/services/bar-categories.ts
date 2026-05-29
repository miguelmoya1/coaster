import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Injectable({
  providedIn: 'root',
})
export class BarCategories {
  readonly #categoryRepository = inject(CategoryRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#categoryRepository.routes.list(barId);
  }
}
