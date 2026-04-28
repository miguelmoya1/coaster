import { inject, Injectable } from '@angular/core';
import { BarId, UpdateCategoryDto } from '@coaster/interfaces';
import { CategoryRepository } from '../data-access/category-repository';

@Injectable({
  providedIn: 'root',
})
export class EditCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async edit(barId: BarId, categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    return await this.#categoryRepository.update(barId, categoryId, updateCategoryDto);
  }
}
