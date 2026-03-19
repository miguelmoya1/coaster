import { inject, Injectable } from '@angular/core';
import { BarId, CreateCategoryDto } from '@coaster/interfaces';
import { CategoryRepository } from '../data-access/category-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async create(barId: BarId, createCategoryDto: CreateCategoryDto) {
    return await this.#categoryRepository.create(barId, createCategoryDto);
  }
}
