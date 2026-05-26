import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { FindAllCategoryTemplatesQuery } from './find-all-category-templates.query';

@QueryHandler(FindAllCategoryTemplatesQuery)
export class FindAllCategoryTemplatesHandler implements IQueryHandler<FindAllCategoryTemplatesQuery, any[]> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

   
  async execute(_query: FindAllCategoryTemplatesQuery): Promise<any[]> {
    const templates = await this._templatesRepository.findAllCategoryTemplates();
    return templates.map((template) => TemplatesMapper.toCategoryTemplate(template));
  }
}
