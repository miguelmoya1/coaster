import type { BarId } from '@coaster/common';
import {
  BarPermission,
  BarSubscription,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { Body, Controller, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { CreateCheckoutSessionCommand, CreateCustomerPortalSessionCommand } from '../commands';
import { CreateCheckoutSessionDto } from '../dto/create-checkout-session.dto';
import { CreateCustomerPortalSessionDto } from '../dto/create-customer-portal-session.dto';
import { GetBarSubscriptionQuery } from '../queries';

@Controller('bars/:barId/billing')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarBillingController {
  private readonly _logger = new Logger(BarBillingController.name);

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
  ) {}

  @Get('subscription')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async getSubscription(@Param('barId') barId: BarId): Promise<BarSubscription> {
    this._logger.debug(`[GET /bars/${barId}/billing/subscription] Fetching subscription info`);
    return this._queryBus.execute(new GetBarSubscriptionQuery(barId));
  }

  @Post('checkout-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCheckoutSession(
    @Param('barId') barId: BarId,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    this._logger.debug(
      `[POST /bars/${barId}/billing/checkout-session] Creating checkout session for plan: ${dto.plan}`,
    );
    return this._commandBus.execute(new CreateCheckoutSessionCommand(barId, dto.plan, dto.successUrl, dto.cancelUrl));
  }

  @Post('customer-portal-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCustomerPortalSession(
    @Param('barId') barId: BarId,
    @Body() dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    this._logger.debug(`[POST /bars/${barId}/billing/customer-portal-session] Creating portal session`);
    return this._commandBus.execute(new CreateCustomerPortalSessionCommand(barId, dto.returnUrl));
  }
}
