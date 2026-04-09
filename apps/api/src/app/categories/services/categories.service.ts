import { asBarId, asCategoryId, BarId, Category, CreateCategoryDto } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { Category as CategoryDb } from '../../core';
import { CategoriesRepository } from '../data-access/categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly _categoriesRepository: CategoriesRepository) {}

  async createCategory(barId: BarId, createCategoryDto: CreateCategoryDto) {
    const category = await this._categoriesRepository.create(barId, createCategoryDto);

    return this.#mapToDomain(category);
  }

  async getCategories(barId: BarId) {
    const categories = await this._categoriesRepository.findByBarId(barId);

    return categories.map((c) => this.#mapToDomain(c));
  }

  #mapToDomain(dbCategory: CategoryDb): Category {
    return {
      id: asCategoryId(dbCategory.id),
      barId: asBarId(dbCategory.barId),
      name: dbCategory.name,
      icon: dbCategory.icon ?? undefined,
    };
  }
}
