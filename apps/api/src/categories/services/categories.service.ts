import { BarId, CreateCategoryDto, SocketEvents, UpdateCategoryDto } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { BarGateway } from '../../core';
import { CategoriesRepository } from '../data-access/categories.repository';
import { CategoriesMapper } from '../mappers/categories.mapper';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly _categoriesRepository: CategoriesRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async createCategory(barId: BarId, createCategoryDto: CreateCategoryDto) {
    const category = await this._categoriesRepository.create(barId, createCategoryDto);

    return CategoriesMapper.toDomain(category);
  }

  async getCategories(barId: BarId) {
    const categories = await this._categoriesRepository.findByBarId(barId);

    return categories.map((c) => CategoriesMapper.toDomain(c));
  }

  async updateCategory(barId: BarId, categoryId: string, dtos: UpdateCategoryDto) {
    const category = await this._categoriesRepository.update(barId, categoryId, dtos);

    return CategoriesMapper.toDomain(category);
  }

  async deleteCategory(barId: BarId, categoryId: string) {
    await this._categoriesRepository.delete(categoryId);
    this._barGateway.server.to(barId).emit(SocketEvents.CATEGORY_DELETED, { id: categoryId });
  }
}
