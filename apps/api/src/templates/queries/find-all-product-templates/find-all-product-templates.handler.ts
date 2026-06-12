import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TemplatesReadRepository } from '../../data-access/templates.read.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { FindAllProductTemplatesQuery } from './find-all-product-templates.query';

@QueryHandler(FindAllProductTemplatesQuery)
export class FindAllProductTemplatesHandler implements IQueryHandler<FindAllProductTemplatesQuery, any[]> {
  constructor(private readonly readRepo: TemplatesReadRepository) {}

  async execute(_query: FindAllProductTemplatesQuery): Promise<any[]> {
    const templates = await this.readRepo.findAllProductTemplates();
    return templates.map((template) => TemplatesMapper.toProductTemplate(template));
  }
}
