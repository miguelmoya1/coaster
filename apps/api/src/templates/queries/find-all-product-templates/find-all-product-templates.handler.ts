import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindAllProductTemplatesQuery } from './find-all-product-templates.query';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';

@QueryHandler(FindAllProductTemplatesQuery)
export class FindAllProductTemplatesHandler implements IQueryHandler<FindAllProductTemplatesQuery, any[]> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(query: FindAllProductTemplatesQuery): Promise<any[]> {
    const templates = await this._templatesRepository.findAllProductTemplates();
    return templates.map((template) => TemplatesMapper.toProductTemplate(template));
  }
}
