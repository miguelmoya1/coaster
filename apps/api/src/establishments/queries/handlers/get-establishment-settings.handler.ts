import type { EstablishmentSettings } from '@coaster/common';
import { DEFAULT_ESTABLISHMENT_MODULES, resolveModules } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentSettingsRepository } from '../../data-access/establishment-settings.repository';
import { EstablishmentSettingsMapper } from '../../mappers/establishment-settings.mapper';
import { GetEstablishmentSettingsQuery } from '../impl/get-establishment-settings.query';

@QueryHandler(GetEstablishmentSettingsQuery)
export class GetEstablishmentSettingsHandler implements IQueryHandler<GetEstablishmentSettingsQuery> {
  constructor(private readonly repository: EstablishmentSettingsRepository) {}

  async execute(query: GetEstablishmentSettingsQuery): Promise<EstablishmentSettings> {
    const settings = await this.repository.find(query.establishmentId);

    if (!settings) {
      return {
        establishmentId: query.establishmentId,
        modules: resolveModules(DEFAULT_ESTABLISHMENT_MODULES),
        configuredAt: null,
      };
    }

    return EstablishmentSettingsMapper.toDto(settings);
  }
}
