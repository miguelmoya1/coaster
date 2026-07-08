import type { BarId, BarStats } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { GetBarStatsQuery } from '../queries/impl/get-bar-stats.query';

@Controller('bars/:barId/stats')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class StatsController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get()
  @BarPermissions(BarPermission.BAR_VIEW_ORDERS)
  async getStats(@Param('barId') barId: BarId): Promise<BarStats> {
    return this._queryBus.execute<GetBarStatsQuery, BarStats>(new GetBarStatsQuery(barId));
  }
}
