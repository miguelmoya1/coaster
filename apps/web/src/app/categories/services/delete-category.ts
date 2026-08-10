import { inject, Service } from '@angular/core';
import type { EstablishmentId, CategoryId } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class DeleteCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(establishmentId: EstablishmentId, categoryId: CategoryId) {
    return await this.#categoryRepository.delete(establishmentId, categoryId);
  }
}
