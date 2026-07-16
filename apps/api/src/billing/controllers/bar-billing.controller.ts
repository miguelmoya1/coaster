import type { BarId } from '@coaster/common';
import {
  BarPermission,
  BarSubscription,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { CreateCheckoutSessionDto } from '../dto/create-checkout-session.dto';
import { CreateCustomerPortalSessionDto } from '../dto/create-customer-portal-session.dto';
import { BillingService } from '../services/billing.service';

@Controller('bars/:barId/billing')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarBillingController {
  constructor(private readonly _billingService: BillingService) {}

  @Get('subscription')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async getSubscription(@Param('barId') barId: string): Promise<BarSubscription> {
    return this._billingService.getBarSubscription(barId as BarId);
  }

  @Post('checkout-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCheckoutSession(
    @Param('barId') barId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    return this._billingService.createCheckoutSession(barId as BarId, dto.plan, dto.successUrl, dto.cancelUrl);
  }

  @Post('customer-portal-session')
  @BarPermissions(BarPermission.BAR_MANAGE_BILLING)
  async createCustomerPortalSession(
    @Param('barId') barId: string,
    @Body() dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    return this._billingService.createCustomerPortalSession(barId as BarId, dto.returnUrl);
  }
}
