import { inject, Service } from '@angular/core';
import type { BarId, CategoryId, UpdateCategoryDto } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class UpdateCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(barId: BarId, categoryId: CategoryId, updateCategoryDto: UpdateCategoryDto): Promise<void> {
    await this.#categoryRepository.update(barId, categoryId, updateCategoryDto);
  }
}
