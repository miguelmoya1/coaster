import type { BarId } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { FindBarSubscriptionQuery } from '../queries';

@Controller('bars/:barId/bar-subscription')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarSubscriptionController {
  private readonly _logger = new Logger(BarSubscriptionController.name);

  constructor(private readonly _queryBus: QueryBus) {}

  @Get()
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async getBarSubscription(@Param('barId') barId: BarId) {
    this._logger.debug(`[GET /bars/${barId}/bar-subscription] Fetching bar subscription from read repo`);
    return await this._queryBus.execute(new FindBarSubscriptionQuery(barId));
  }
}
