import type { StarterCatalogueCategory } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CatalogueRepository } from '../../data-access/catalogue.repository';
import { resolveCatalogue } from '../../domain/resolve-catalogue';
import { GetStarterCatalogueQuery } from '../impl/get-starter-catalogue.query';

@QueryHandler(GetStarterCatalogueQuery)
export class GetStarterCatalogueHandler implements IQueryHandler<GetStarterCatalogueQuery, StarterCatalogueCategory[]> {
  constructor(private readonly repository: CatalogueRepository) {}

  async execute(query: GetStarterCatalogueQuery): Promise<StarterCatalogueCategory[]> {
    const language = await this.repository.languageOf(query.establishmentId);

    return resolveCatalogue(language);
  }
}
