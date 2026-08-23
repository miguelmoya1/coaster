import { httpResource } from '@angular/common/http';
import { effect, inject, Service, signal } from '@angular/core';
import {
  ErrorCodes,
  type EstablishmentId,
  type CategoryId,
  type CreateCategoryDto,
  type UpdateCategoryDto,
} from '@coaster/common';
import { Realtime } from '@coaster/core';
import { categoryArrayMapper, categoryMapper } from '../mappers/category.mapper';
import { EstablishmentCategories } from '../services/establishment-categories';
import { CreateCategory } from '../services/create-category';
import { DeleteCategory } from '../services/delete-category';
import { UpdateCategory } from '../services/update-category';

@Service()
export class CategoriesStore {
  readonly #categories = inject(EstablishmentCategories);
  readonly #createCategory = inject(CreateCategory);
  readonly #updateCategory = inject(UpdateCategory);
  readonly #deleteCategory = inject(DeleteCategory);
  readonly #realtime = inject(Realtime);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #categoriesResource = httpResource(() => this.#categories.execute(this.#currentEstablishmentId()), {
    parse: categoryArrayMapper,
  });

  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();
  public readonly list = this.#categoriesResource.asReadonly();

  constructor() {
    effect(() => {
      const deleted = this.#realtime.categoryDeleted();
      if (deleted) {
        this.#categoriesResource.update((categories) => {
          if (!categories) {
            return undefined;
          }
          return categories.filter((c) => c.id !== deleted.id);
        });
      }
    });

    effect(() => {
      const created = this.#realtime.categoryCreated();
      if (created) {
        const mappedCreated = categoryMapper(created);
        this.#categoriesResource.update((categories) => {
          if (!categories) {
            return [mappedCreated];
          }
          const exists = categories.some((c) => c.id === mappedCreated.id);
          return exists ? categories : [...categories, mappedCreated];
        });
      }
    });

    effect(() => {
      const updated = this.#realtime.categoryUpdated();
      if (updated) {
        const mappedUpdated = categoryMapper(updated);
        this.#categoriesResource.update((categories) => {
          if (!categories) {
            return undefined;
          }
          return categories.map((c) => (c.id === mappedUpdated.id ? mappedUpdated : c));
        });
      }
    });
  }

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reloadCategories() {
    this.#categoriesResource.reload();
  }

  public async create(createCategoryDto: CreateCategoryDto) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      this.reloadCategories();
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#createCategory.execute(establishmentId, createCategoryDto);
    this.reloadCategories();
  }

  public async update(categoryId: CategoryId, updateCategoryDto: UpdateCategoryDto) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      this.reloadCategories();
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#updateCategory.execute(establishmentId, categoryId, updateCategoryDto);
    this.reloadCategories();
  }

  public async delete(categoryId: CategoryId) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      this.reloadCategories();
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#deleteCategory.execute(establishmentId, categoryId);
    this.#categoriesResource.update((categories) => {
      if (!categories) {
        return undefined;
      }
      return categories.filter((c) => c.id !== categoryId);
    });
  }
}
