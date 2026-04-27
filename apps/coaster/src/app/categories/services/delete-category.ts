import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { CategoryRepository } from '../data-access/category-repository';

@Injectable({
  providedIn: 'root',
})
export class DeleteCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async delete(barId: BarId, categoryId: string) {
    return await this.#categoryRepository.delete(barId, categoryId);
  }
}
