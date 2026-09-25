import { inject, Service } from '@angular/core';
import type { CategoryId, CreateCategoryDto, EstablishmentId, UpdateCategoryDto } from '@coaster/common';
import { CategoryRepository } from '../data-access/category-repository';

@Service()
export class ManageCategories {
  readonly #repository = inject(CategoryRepository);

  public async create(establishmentId: EstablishmentId, dto: CreateCategoryDto): Promise<void> {
    await this.#repository.create(establishmentId, dto);
  }

  public async update(establishmentId: EstablishmentId, categoryId: CategoryId, dto: UpdateCategoryDto): Promise<void> {
    await this.#repository.update(establishmentId, categoryId, dto);
  }

  public async delete(establishmentId: EstablishmentId, categoryId: CategoryId): Promise<void> {
    await this.#repository.delete(establishmentId, categoryId);
  }
}
