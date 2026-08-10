import type { EstablishmentSettings } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEstablishmentSettingsQuery } from '../impl/get-establishment-settings.query';

@QueryHandler(GetEstablishmentSettingsQuery)
export class GetEstablishmentSettingsHandler implements IQueryHandler<GetEstablishmentSettingsQuery> {
  constructor(private readonly _securityRepository: SecurityRepository) {}

  async execute(query: GetEstablishmentSettingsQuery): Promise<EstablishmentSettings> {
    return {
      establishmentId: query.establishmentId,
      modules: await this._securityRepository.getEnabledModules(query.establishmentId),
    };
  }
}
