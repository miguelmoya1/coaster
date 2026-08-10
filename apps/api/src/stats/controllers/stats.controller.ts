import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, EstablishmentStats } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetEstablishmentStatsQuery } from '../queries/impl/get-establishment-stats.query';

@Controller('establishments/:establishmentId/stats')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class StatsController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS)
  async getStats(@Param('establishmentId') establishmentId: EstablishmentId): Promise<EstablishmentStats> {
    return this._queryBus.execute<GetEstablishmentStatsQuery, EstablishmentStats>(
      new GetEstablishmentStatsQuery(establishmentId),
    );
  }
}
