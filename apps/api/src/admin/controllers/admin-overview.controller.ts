import { FirebaseAuthGuard } from '@coaster/auth';
import type { AdminAuditLogEntry, AdminPlatformMetrics, Paginated } from '@coaster/common';
import { Admin, AdminGuard } from '@coaster/core';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { AdminAuditQueryDto } from '../dto';
import { GetPlatformMetricsQuery, ListAuditLogQuery } from '../queries';

@Controller('admin')
@Admin()
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminOverviewController {
  constructor(private readonly _queryBus: QueryBus) {}

  @Get('overview')
  async getOverview(): Promise<AdminPlatformMetrics> {
    return await this._queryBus.execute(new GetPlatformMetricsQuery());
  }

  @Get('audit')
  async getAuditLog(@Query() query: AdminAuditQueryDto): Promise<Paginated<AdminAuditLogEntry>> {
    return await this._queryBus.execute(new ListAuditLogQuery(query));
  }
}
