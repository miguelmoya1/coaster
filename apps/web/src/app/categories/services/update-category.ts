import { inject, Service } from '@angular/core';
import type { EstablishmentId, CategoryId, UpdateCategoryDto } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class UpdateCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(
    establishmentId: EstablishmentId,
    categoryId: CategoryId,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<void> {
    await this.#categoryRepository.update(establishmentId, categoryId, updateCategoryDto);
  }
}
