import type { BarId } from '@coaster/common';
import {
  BarPermission,
  BarSubscription,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
  ) {}

  @Get('subscription')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async getSubscription(@Param('barId') barId: BarId): Promise<BarSubscription> {
    return this._queryBus.execute(new GetBarSubscriptionQuery(barId));
  }

  @Post('checkout-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCheckoutSession(
    @Param('barId') barId: BarId,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    return this._commandBus.execute(new CreateCheckoutSessionCommand(barId, dto.plan, dto.successUrl, dto.cancelUrl));
  }

  @Post('customer-portal-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCustomerPortalSession(
    @Param('barId') barId: BarId,
    @Body() dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    return this._commandBus.execute(new CreateCustomerPortalSessionCommand(barId, dto.returnUrl));
  }
}
