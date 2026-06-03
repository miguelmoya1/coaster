import { httpResource } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import type { BarId, CategoryId, CreateCategoryDto, UpdateCategoryDto } from '@coaster/common';
import { handleErrorFormField, Socket } from '@coaster/core';
import { categoryArrayMapper } from '../mappers/category.mapper';
import { BarCategories } from '../services/bar-categories';
import { CreateCategory } from '../services/create-category';
import { DeleteCategory } from '../services/delete-category';
import { UpdateCategory } from '../services/update-category';

@Injectable({
  providedIn: 'root',
})
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
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      await this.#createCategory.execute(barId, createCategoryDto);
      this.reloadCategories();
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async update(categoryId: CategoryId, updateCategoryDto: UpdateCategoryDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reloadCategories();
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      await this.#updateCategory.execute(barId, categoryId, updateCategoryDto);
      this.reloadCategories();
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async delete(categoryId: CategoryId) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reloadCategories();
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      await this.#deleteCategory.execute(barId, categoryId);
      this.#categoriesResource.update((categories) => {
        if (!categories) {
          return undefined;
        }
        return categories.filter((c) => c.id !== categoryId);
      });
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
