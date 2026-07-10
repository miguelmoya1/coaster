import { httpResource } from '@angular/common/http';
import { effect, inject, Service, signal } from '@angular/core';
import { ErrorCodes, type BarId, type CategoryId, type CreateCategoryDto, type UpdateCategoryDto } from '@coaster/common';
import { Socket } from '@coaster/core';
import { categoryArrayMapper, categoryMapper } from '../mappers/category.mapper';
import { BarCategories } from '../services/bar-categories';
import { CreateCategory } from '../services/create-category';
import { DeleteCategory } from '../services/delete-category';
import { UpdateCategory } from '../services/update-category';

@Service()
export class CategoriesStore {
  readonly #categories = inject(BarCategories);
  readonly #createCategory = inject(CreateCategory);
  readonly #updateCategory = inject(UpdateCategory);
  readonly #deleteCategory = inject(DeleteCategory);
  readonly #socketService = inject(Socket);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #categoriesResource = httpResource(() => this.#categories.execute(this.#currentBarId()), {
    parse: categoryArrayMapper,
  });

  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly list = this.#categoriesResource.asReadonly();

  constructor() {
    effect(() => {
      const deleted = this.#socketService.categoryDeleted();
      if (deleted) {
        this.#categoriesResource.update((categories) => {
          if (!categories) {
            return undefined;
          }
          return categories.filter((c) => c.id !== deleted.id);
        });
      }
    });

    // Category created
    effect(() => {
      const created = this.#socketService.categoryCreated();
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

    // Category updated
    effect(() => {
      const updated = this.#socketService.categoryUpdated();
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

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadCategories() {
    this.#categoriesResource.reload();
  }

  public async create(createCategoryDto: CreateCategoryDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reloadCategories();
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#createCategory.execute(barId, createCategoryDto);
    this.reloadCategories();
  }

  public async update(categoryId: CategoryId, updateCategoryDto: UpdateCategoryDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reloadCategories();
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#updateCategory.execute(barId, categoryId, updateCategoryDto);
    this.reloadCategories();
  }

  public async delete(categoryId: CategoryId) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reloadCategories();
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#deleteCategory.execute(barId, categoryId);
    this.#categoriesResource.update((categories) => {
      if (!categories) {
        return undefined;
      }
      return categories.filter((c) => c.id !== categoryId);
    });
  }
}
