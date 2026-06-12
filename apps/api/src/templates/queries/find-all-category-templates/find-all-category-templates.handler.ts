import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TemplatesReadRepository } from '../../data-access/templates.read.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { FindAllCategoryTemplatesQuery } from './find-all-category-templates.query';

@QueryHandler(FindAllCategoryTemplatesQuery)
export class FindAllCategoryTemplatesHandler implements IQueryHandler<FindAllCategoryTemplatesQuery, any[]> {
  constructor(private readonly readRepo: TemplatesReadRepository) {}

  async execute(_query: FindAllCategoryTemplatesQuery): Promise<any[]> {
    const templates = await this.readRepo.findAllCategoryTemplates();
    return templates.map((template) => TemplatesMapper.toCategoryTemplate(template));
  }
}
