import { inject, Injectable } from '@angular/core';
import type { BarId, CategoryId, UpdateCategoryDto } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(barId: BarId, categoryId: CategoryId, updateCategoryDto: UpdateCategoryDto) {
    return await this.#categoryRepository.update(barId, categoryId, updateCategoryDto);
  }
}
