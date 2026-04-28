import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { CategoryRepository } from '../data-access/category-repository';
import { categoryArrayMapper } from '../mappers/category.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarCategories {
  readonly #categoryRepository = inject(CategoryRepository);
  readonly #barId = signal<BarId | undefined>(undefined);

  readonly #all = httpResource(
    () => {
      const barId = this.#barId();
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

  public setBarContext(barId: BarId) {
    this.#barId.set(barId);
  }

  public reload() {
    this.#all.reload();
  }
}
