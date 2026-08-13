import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateCategoryDto } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class CreateCategory {
  readonly #categoryRepository = inject(CategoryRepository);

  public async execute(establishmentId: EstablishmentId, createCategoryDto: CreateCategoryDto): Promise<void> {
    await this.#categoryRepository.create(establishmentId, createCategoryDto);
  }
}
