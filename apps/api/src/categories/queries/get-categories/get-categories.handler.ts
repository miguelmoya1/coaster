import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCategoriesQuery } from './get-categories.query';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { Category } from '@coaster/common';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery, Category[]> {
  constructor(private readonly repository: CategoriesRepository) {}

  async execute(query: GetCategoriesQuery): Promise<Category[]> {
    const categories = await this.repository.findByBarId(query.barId);
    return categories.map((c) => CategoriesMapper.toDomain(c));
  }
}
