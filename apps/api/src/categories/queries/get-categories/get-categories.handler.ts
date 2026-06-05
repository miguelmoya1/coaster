import type { Category } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { GetCategoriesQuery } from './get-categories.query';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery, Category[]> {
  constructor(private readonly repository: CategoriesRepository) {}

  async execute(query: GetCategoriesQuery): Promise<Category[]> {
    const categories = await this.repository.findByBarId(query.barId);
    return categories.map((c) => CategoriesMapper.toDomain(c));
  }
}
