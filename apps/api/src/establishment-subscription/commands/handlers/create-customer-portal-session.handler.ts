import type { CreateCustomerPortalSessionResponse } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { StripeApi } from '@coaster/stripe';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { getBillingDashboardUrl } from '../../utils/billing-urls';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';

@Injectable()
@CommandHandler(CreateCustomerPortalSessionCommand)
export class CreateCustomerPortalSessionHandler implements ICommandHandler<
  CreateCustomerPortalSessionCommand,
  CreateCustomerPortalSessionResponse
> {
  private readonly _logger = new Logger(CreateCustomerPortalSessionHandler.name);

  constructor(
    private readonly _stripeApi: StripeApi,
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _configService: ConfigService,
  ) {}

  async execute(command: CreateCustomerPortalSessionCommand): Promise<CreateCustomerPortalSessionResponse> {
    const { establishmentId } = command;
    this._logger.debug(`Executing CreateCustomerPortalSessionCommand for establishmentId=${establishmentId}`);

    const subscription = await this._readRepo.findByEstablishmentId(establishmentId);

    if (!subscription?.stripeCustomerId) {
      this._logger.warn(
        `Cannot create customer portal session: No Stripe customer found for establishmentId=${establishmentId}`,
      );
      throw new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND);
    }

    const returnUrl = getBillingDashboardUrl(this._configService, establishmentId);
    const session = await this._stripeApi.createBillingPortalSession(subscription.stripeCustomerId, returnUrl);

    if (session) {
      this._logger.debug(`Customer portal session created for establishmentId=${establishmentId}`);
      return session;
    }

    const remoteCustomerId = subscription.stripeSubscriptionId
      ? await this._stripeApi.findSubscriptionCustomerId(subscription.stripeSubscriptionId)
      : null;

    if (remoteCustomerId && remoteCustomerId !== subscription.stripeCustomerId) {
      const retriedSession = await this._stripeApi.createBillingPortalSession(remoteCustomerId, returnUrl);

      if (retriedSession) {
        this._logger.debug(
          `Customer portal session created for establishmentId=${establishmentId} using the remote Stripe customer`,
        );
        return retriedSession;
      }
    }

    this._logger.warn(
      `Stripe customer ${subscription.stripeCustomerId} is no longer available for establishmentId=${establishmentId}`,
    );
    throw new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND);
  }
}
