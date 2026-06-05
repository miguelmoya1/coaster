import { inject, Service } from '@angular/core';
import type { BarId, CategoryId } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class DeleteCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(barId: BarId, categoryId: CategoryId) {
    return await this.#categoryRepository.delete(barId, categoryId);
  }
}
