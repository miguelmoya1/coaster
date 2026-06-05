import type { BarId, BarStats } from '@coaster/common';
import { BarPermission } from '../../core';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Permissions, PermissionsGuard } from '../../core';
import { FirebaseAuthGuard } from '../../auth';
import { GetBarStatsQuery } from '../queries/get-bar-stats/get-bar-stats.query';

@Controller('bars/:barId/stats')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class StatsController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get()
  @Permissions(BarPermission.VIEW_ORDERS)
  async getStats(@Param('barId') barId: BarId): Promise<BarStats> {
    return this._queryBus.execute<GetBarStatsQuery, BarStats>(new GetBarStatsQuery(barId));
  }
}
