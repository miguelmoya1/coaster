import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { FindAllProductTemplatesQuery } from './find-all-product-templates.query';

@QueryHandler(FindAllProductTemplatesQuery)
export class FindAllProductTemplatesHandler implements IQueryHandler<FindAllProductTemplatesQuery, any[]> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

   
  async execute(_query: FindAllProductTemplatesQuery): Promise<any[]> {
    const templates = await this._templatesRepository.findAllProductTemplates();
    return templates.map((template) => TemplatesMapper.toProductTemplate(template));
  }
}
