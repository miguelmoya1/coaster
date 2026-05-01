import { inject, Injectable } from '@angular/core';
import { BarId, CategoryId } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Injectable({
  providedIn: 'root',
})
export class DeleteCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async delete(barId: BarId, categoryId: CategoryId) {
    return await this.#categoryRepository.delete(barId, categoryId);
  }
}
