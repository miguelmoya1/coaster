import {
  asBarId,
  asCategoryId,
  asProductId,
  asProductStatus,
  BarId,
  Category,
  CreateCategoryDto,
  Product,
} from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { Category as CategoryDb, Product as ProductDb } from '../../core';
import { CategoriesRepository } from '../data-access/categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly _categoriesRepository: CategoriesRepository) {}

  async createCategory(barId: BarId, createCategoryDto: CreateCategoryDto) {
    const category = await this._categoriesRepository.create(barId, createCategoryDto);

    return this.#mapToDomain(category);
  }

  async getCategoriesWithProducts(barId: BarId) {
    const categories = await this._categoriesRepository.findByBarId(barId);

    return categories.map((c) => this.#mapToDomain(c));
  }

  #mapToDomain(dbCategory: CategoryDb & { products?: ProductDb[] }): Category {
    return {
      id: asCategoryId(dbCategory.id),
      barId: asBarId(dbCategory.barId),
      name: dbCategory.name,
      icon: dbCategory.icon ?? undefined,
      products: dbCategory.products?.map(
        (p: ProductDb): Product => ({
          id: asProductId(p.id),
          categoryId: asCategoryId(p.categoryId),
          name: p.name,
          status: asProductStatus(p.status),
          lastUpdated: p.updatedAt.toISOString(),
        })
      ),
    };
  }
}
