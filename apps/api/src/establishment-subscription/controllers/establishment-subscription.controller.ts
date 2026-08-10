import { FirebaseAuthGuard } from '@coaster/auth';
import type {
  EstablishmentId,
  EstablishmentSubscription,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { EstablishmentPermission, SubscriptionPlan } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCheckoutSessionCommand, CreateCustomerPortalSessionCommand } from '../commands';
import { CreateCheckoutSessionDto, CreateCustomerPortalSessionDto } from '../dto';
import { FindEstablishmentSubscriptionQuery } from '../queries';

@Controller('establishments/:establishmentId/establishment-subscription')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class EstablishmentSubscriptionController {
  private readonly _logger = new Logger(EstablishmentSubscriptionController.name);

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
  ) {}

  @Get()
  async getEstablishmentSubscription(
    @Param('establishmentId') establishmentId: EstablishmentId,
  ): Promise<EstablishmentSubscription> {
    this._logger.debug(
      `[GET /establishments/${establishmentId}/establishment-subscription] Fetching establishment subscription from read repo`,
    );
    return await this._queryBus.execute(new FindEstablishmentSubscriptionQuery(establishmentId));
  }

  @Post('checkout-session')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING)
  async createCheckoutSession(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    const plan = dto.plan ?? SubscriptionPlan.PRO;
    this._logger.debug(
      `[POST /establishments/${establishmentId}/establishment-subscription/checkout-session] Creating checkout session for plan: ${plan}`,
    );
    return await this._commandBus.execute(new CreateCheckoutSessionCommand(establishmentId, plan));
  }

  @Post('customer-portal-session')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING)
  async createCustomerPortalSession(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() _dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    this._logger.debug(
      `[POST /establishments/${establishmentId}/establishment-subscription/customer-portal-session] Creating portal session`,
    );
    return await this._commandBus.execute(new CreateCustomerPortalSessionCommand(establishmentId));
  }
}
