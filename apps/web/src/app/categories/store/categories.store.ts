import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId, CategoryId, CreateCategoryDto, UpdateCategoryDto } from '@coaster/common';
import { handleErrorFormField } from '../../core';
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

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #categoriesResource = httpResource(() => this.#categories.execute(this.#currentBarId()), {
    parse: categoryArrayMapper,
  });

  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly list = this.#categoriesResource.asReadonly();

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
      const category = await this.#createCategory.execute(barId, createCategoryDto);

      if (!this.#categoriesResource.hasValue()) {
        this.#categoriesResource.set([category]);
        return null;
      }

      const categories = this.#categoriesResource.value();
      if (!categories) {
        this.#categoriesResource.set([category]);
        return null;
      }

      this.#categoriesResource.update((categories) => [...categories, category]);
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
      const category = await this.#updateCategory.execute(barId, categoryId, updateCategoryDto);

      if (!this.#categoriesResource.hasValue()) {
        this.#categoriesResource.set([category]);
        return null;
      }

      const categories = this.#categoriesResource.value();
      if (!categories) {
        this.#categoriesResource.set([category]);
        return null;
      }

      this.#categoriesResource.update((categories) => categories.map((c) => (c.id === categoryId ? category : c)));
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

      if (!this.#categoriesResource.hasValue()) {
        this.#categoriesResource.set([]);
        return null;
      }

      const categories = this.#categoriesResource.value();
      if (!categories) {
        this.#categoriesResource.set([]);
        return null;
      }

      this.#categoriesResource.update((categories) => categories.filter((c) => c.id !== categoryId));
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
