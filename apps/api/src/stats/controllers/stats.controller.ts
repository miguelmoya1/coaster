import type { BarId, BarStats } from '@coaster/common';
import { BarPermission } from '../../core';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { FirebaseAuthGuard } from '../../auth';
import { GetBarStatsQuery } from '../queries/impl/get-bar-stats.query';

@Controller('bars/:barId/stats')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class StatsController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get()
  @BarPermissions(BarPermission.VIEW_ORDERS)
  async getStats(@Param('barId') barId: BarId): Promise<BarStats> {
    return this._queryBus.execute<GetBarStatsQuery, BarStats>(new GetBarStatsQuery(barId));
  }
}
