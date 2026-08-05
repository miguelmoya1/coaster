import type { BarId } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Controller, Get, Logger, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { BarSubscriptionReadRepository } from '../data-access/bar-subscription.read.repository';

@Controller('bars/:barId/bar-subscription')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarSubscriptionController {
  private readonly _logger = new Logger(BarSubscriptionController.name);

  constructor(private readonly _readRepo: BarSubscriptionReadRepository) {}

  @Get()
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async getBarSubscription(@Param('barId') barId: BarId) {
    this._logger.debug(`[GET /bars/${barId}/bar-subscription] Fetching bar subscription from read repo`);
    const subscription = await this._readRepo.findByBarId(barId);

    if (!subscription) {
      this._logger.debug(`Bar subscription not found for barId=${barId}`);
      throw new NotFoundException(`Bar subscription not found for barId: ${barId}`);
    }

    return subscription;
  }
}
