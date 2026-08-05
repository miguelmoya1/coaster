import type { CreateCustomerPortalSessionResponse } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { StripeClient } from '../../../stripe/utils/stripe-client.provider';
import { isStripeResourceMissingError } from '../../../stripe/utils/stripe.utils';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { getBillingDashboardUrl } from '../../utils/billing-urls';
import { CreateCustomerPortalSessionCommand } from '../impl/create-customer-portal-session.command';

@Injectable()
@CommandHandler(CreateCustomerPortalSessionCommand)
export class CreateCustomerPortalSessionHandler
  implements ICommandHandler<CreateCustomerPortalSessionCommand, CreateCustomerPortalSessionResponse>
{
  private readonly _logger = new Logger(CreateCustomerPortalSessionHandler.name);

  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _readRepo: BarSubscriptionReadRepository,
    private readonly _configService: ConfigService,
  ) {}

  async execute(command: CreateCustomerPortalSessionCommand): Promise<CreateCustomerPortalSessionResponse> {
    const { barId } = command;
    this._logger.debug(`Executing CreateCustomerPortalSessionCommand for barId=${barId}`);

    const subscription = await this._readRepo.findByBarId(barId);

    if (!subscription?.stripeCustomerId) {
      this._logger.warn(`Cannot create customer portal session: No Stripe customer found for barId=${barId}`);
      throw new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND);
    }

    try {
      return await this.createPortalSession(subscription.stripeCustomerId, barId);
    } catch (error) {
      if (!isStripeResourceMissingError(error, 'customer')) {
        this._logger.error(`Customer portal session creation failed for barId=${barId}`);
        throw new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }

      const remoteCustomerId = await this.findRemoteCustomerId(subscription.stripeSubscriptionId);
      if (remoteCustomerId && remoteCustomerId !== subscription.stripeCustomerId) {
        try {
          return await this.createPortalSession(remoteCustomerId, barId);
        } catch (retryError) {
          if (!isStripeResourceMissingError(retryError, 'customer')) {
            this._logger.error(`Customer portal retry failed for barId=${barId}`);
            throw new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
          }
        }
      }

      this._logger.warn(`Stripe customer ${subscription.stripeCustomerId} is no longer available for barId=${barId}`);
      throw new BadRequestException(ErrorCodes.STRIPE_CUSTOMER_NOT_FOUND);
    }
  }

  private async createPortalSession(customerId: string, barId: string) {
    const portalSession = await this._stripeClient.client.billingPortal.sessions.create({
      customer: customerId,
      return_url: getBillingDashboardUrl(this._configService, barId),
    });

    this._logger.debug(`Customer portal session created for barId=${barId}`);
    return { url: portalSession.url };
  }

  private async findRemoteCustomerId(subscriptionId: string | null): Promise<string | null> {
    if (!subscriptionId) {
      return null;
    }

    try {
      const remoteSubscription = await this._stripeClient.client.subscriptions.retrieve(subscriptionId);
      const customer = remoteSubscription.customer;
      return typeof customer === 'string' ? customer : ((customer as Stripe.Customer | null)?.id ?? null);
    } catch (error) {
      if (isStripeResourceMissingError(error, 'subscription')) {
        return null;
      }

      this._logger.error(`Could not retrieve Stripe subscription ${subscriptionId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_SUBSCRIPTION_LOOKUP_FAILED);
    }
  }
}
