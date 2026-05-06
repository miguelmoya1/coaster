import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CurrentBar } from '../../bars';
import { CategoryRepository } from '../data-access/category-repository';
import { categoryArrayMapper } from '../mappers/category.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarCategories {
  readonly #categoryRepository = inject(CategoryRepository);
  readonly #currentBar = inject(CurrentBar);

  readonly #all = httpResource(
    () => {
      const barId = this.#currentBar.currentId();
      if (!barId) {
        return undefined;
      }
      return this.#categoryRepository.routes.list(barId);
    },
    {
      parse: (categories) => categoryArrayMapper(categories),
    },
  );

  readonly all = this.#all.asReadonly();

  public reload() {
    this.#all.reload();
  }
}
