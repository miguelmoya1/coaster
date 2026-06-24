import type { Category } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategoriesReadRepository } from '../../data-access/categories.read.repository';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { GetCategoriesQuery } from '../impl/get-categories.query';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery, Category[]> {
  constructor(private readonly readRepo: CategoriesReadRepository) {}

  async execute(query: GetCategoriesQuery): Promise<Category[]> {
    const categories = await this.readRepo.findByBarId(query.barId);
    return categories.map((c) => CategoriesMapper.toDomain(c));
  }
}
