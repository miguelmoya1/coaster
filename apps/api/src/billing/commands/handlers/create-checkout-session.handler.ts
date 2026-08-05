import { CreateCheckoutSessionResponse, ErrorCodes } from '@coaster/common';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import Stripe from 'stripe';
import { DbSubscriptionStatus } from '../../../core/db';
import { StripeClient } from '../../../stripe/utils/stripe-client.provider';
import { createIntegrationIdentifier, getPriceId, isStripeResourceMissingError } from '../../../stripe/utils/stripe.utils';
import { BillingReadRepository } from '../../data-access/billing.read.repository';
import { getCheckoutCancelUrl, getCheckoutSuccessUrl } from '../../utils/billing-urls';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';

@Injectable()
@CommandHandler(CreateCheckoutSessionCommand)
export class CreateCheckoutSessionHandler implements ICommandHandler<
  CreateCheckoutSessionCommand,
  CreateCheckoutSessionResponse
> {
  private readonly _logger = new Logger(CreateCheckoutSessionHandler.name);

  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _configService: ConfigService,
    private readonly _readRepo: BillingReadRepository,
  ) {}

  async execute(command: CreateCheckoutSessionCommand): Promise<CreateCheckoutSessionResponse> {
    const { barId, plan } = command;
    this._logger.debug(`Executing CreateCheckoutSessionCommand for barId=${barId}, plan=${plan}`);

    const existing = await this._readRepo.findSubscriptionByBarId(barId);
    const hasStripeSubscription = Boolean(existing?.stripeSubscriptionId);
    const isPendingCancellation =
      existing?.status === DbSubscriptionStatus.CANCELED &&
      Boolean(existing.currentPeriodEnd && new Date() <= existing.currentPeriodEnd);
    const isTerminalCancellation = existing?.status === DbSubscriptionStatus.CANCELED && !isPendingCancellation;
    const hasRemoteSubscription =
      Boolean(existing?.stripeSubscriptionId) &&
      !isTerminalCancellation &&
      (await this.hasRemoteSubscription(existing!.stripeSubscriptionId!));

    if (hasRemoteSubscription) {
      if (isPendingCancellation) {
        this._logger.warn(`Bar barId=${barId} has a subscription pending cancellation`);
        throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION);
      }

      this._logger.warn(`Bar barId=${barId} already has a Stripe subscription ${existing?.stripeSubscriptionId}`);
      throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_ALREADY_EXISTS);
    }

    if (isPendingCancellation && !existing?.stripeSubscriptionId) {
      this._logger.warn(`Bar barId=${barId} has a subscription pending cancellation`);
      throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION);
    }

    if (hasStripeSubscription && !isTerminalCancellation) {
      this._logger.warn(
        `Ignoring stale Stripe subscription reference for barId=${barId}: ${existing?.stripeSubscriptionId}`,
      );
    }

    const priceId = getPriceId(plan, this._configService);
    const customerId = existing?.stripeCustomerId;

    const session = await this.createCheckoutSession(
      {
        mode: 'subscription',
        success_url: getCheckoutSuccessUrl(this._configService, barId),
        cancel_url: getCheckoutCancelUrl(this._configService, barId),
        client_reference_id: barId,
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        integration_identifier: createIntegrationIdentifier(),
        metadata: {
          barId,
          plan,
        },
        subscription_data: {
          metadata: {
            barId,
            plan,
          },
        },
      },
      customerId,
    );

    if (!session.url) {
      this._logger.error(`Stripe checkout session creation returned null URL for barId=${barId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
    }

    this._logger.debug(`Checkout session created successfully: id=${session.id}`);

    return {
      id: session.id,
      url: session.url,
    };
  }

  private async hasRemoteSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this._stripeClient.client.subscriptions.retrieve(subscriptionId);
      return true;
    } catch (error) {
      if (isStripeResourceMissingError(error, 'subscription')) {
        return false;
      }

      this._logger.error(`Could not verify Stripe subscription ${subscriptionId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_SUBSCRIPTION_LOOKUP_FAILED);
    }
  }

  private async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
    customerId?: string | null,
  ): Promise<Stripe.Checkout.Session> {
    const request = customerId ? { ...params, customer: customerId } : params;

    try {
      return await this._stripeClient.client.checkout.sessions.create(request);
    } catch (error) {
      if (!customerId || !isStripeResourceMissingError(error, 'customer')) {
        this._logger.error('Stripe checkout session creation failed');
        throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
      }

      this._logger.warn(`Stripe customer ${customerId} is missing; retrying Checkout without a customer`);
      const retryRequest = { ...params };
      delete retryRequest.customer;

      try {
        return await this._stripeClient.client.checkout.sessions.create(retryRequest);
      } catch {
        this._logger.error('Stripe checkout session retry failed');
        throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
      }
    }
  }
}
