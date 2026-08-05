import type {
  BarId,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { BarPermission, SubscriptionPlan } from '@coaster/common';
import { Body, Controller, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { CreateCheckoutSessionCommand, CreateCustomerPortalSessionCommand } from '../commands';
import { CreateCheckoutSessionDto, CreateCustomerPortalSessionDto } from '../dto';
import { FindBarSubscriptionQuery } from '../queries';

@Controller('bars/:barId/bar-subscription')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarSubscriptionController {
  private readonly _logger = new Logger(BarSubscriptionController.name);

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
  ) {}

  @Get()
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async getBarSubscription(@Param('barId') barId: BarId) {
    this._logger.debug(`[GET /bars/${barId}/bar-subscription] Fetching bar subscription from read repo`);
    return await this._queryBus.execute(new FindBarSubscriptionQuery(barId));
  }

  @Post('checkout-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCheckoutSession(
    @Param('barId') barId: BarId,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    const plan = dto.plan ?? SubscriptionPlan.PRO;
    this._logger.debug(
      `[POST /bars/${barId}/bar-subscription/checkout-session] Creating checkout session for plan: ${plan}`,
    );
    return await this._commandBus.execute(new CreateCheckoutSessionCommand(barId, plan));
  }

  @Post('customer-portal-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCustomerPortalSession(
    @Param('barId') barId: BarId,
    @Body() _dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    this._logger.debug(`[POST /bars/${barId}/bar-subscription/customer-portal-session] Creating portal session`);
    return await this._commandBus.execute(new CreateCustomerPortalSessionCommand(barId));
  }
}
