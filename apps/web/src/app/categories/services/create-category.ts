import { inject, Service } from '@angular/core';
import type { BarId, CreateCategoryDto } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class CreateCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(barId: BarId, createCategoryDto: CreateCategoryDto): Promise<void> {
    await this.#categoryRepository.create(barId, createCategoryDto);
  }
}
