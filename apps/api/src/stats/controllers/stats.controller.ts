import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, EstablishmentStats } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard, EstablishmentPermissionsOf } from '@coaster/core';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetEstablishmentStatsQuery } from '../queries/impl/get-establishment-stats.query';

@Controller('establishments/:establishmentId/stats')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class StatsController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS)
  async getStats(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @EstablishmentPermissionsOf() permissions: EstablishmentPermission[],
  ): Promise<EstablishmentStats> {
    const includeHistory = permissions.includes(EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS_HISTORY);

    return this._queryBus.execute<GetEstablishmentStatsQuery, EstablishmentStats>(
      new GetEstablishmentStatsQuery(establishmentId, includeHistory),
    );
  }
}
