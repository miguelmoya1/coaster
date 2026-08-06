import { ErrorCodes } from '@coaster/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { Checkout, Subscription } from 'stripe';
import { StripeClient } from '../utils/stripe-client.provider';
import { isStripeResourceMissingError } from '../utils/stripe.utils';

@Injectable()
export class StripeApi {
  readonly #logger = new Logger(StripeApi.name);

  constructor(private readonly _stripeClient: StripeClient) {}

  public async createCheckoutSession(
    params: Checkout.SessionCreateParams,
    customerId?: string | null,
  ): Promise<Checkout.Session> {
    const request = customerId ? { ...params, customer: customerId } : params;

    try {
      return await this._stripeClient.client.checkout.sessions.create(request);
    } catch (error) {
      if (!customerId || !isStripeResourceMissingError(error, 'customer')) {
        this.#logger.error('Stripe checkout session creation failed');
        throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
      }

      this.#logger.warn(`Stripe customer ${customerId} is missing; retrying Checkout without a customer`);
      const retryRequest = { ...params };
      delete retryRequest.customer;

      try {
        return await this._stripeClient.client.checkout.sessions.create(retryRequest);
      } catch {
        this.#logger.error('Stripe checkout session retry failed');
        throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
      }
    }
  }

  public async createBillingPortalSession(customerId: string, returnUrl: string): Promise<{ url: string } | null> {
    try {
      const session = await this._stripeClient.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      if (isStripeResourceMissingError(error, 'customer')) {
        return null;
      }

      this.#logger.error(`Stripe billing portal session creation failed for customer ${customerId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
    }
  }

  public async retrieveSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      return await this._stripeClient.client.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      if (isStripeResourceMissingError(error, 'subscription')) {
        return null;
      }

      this.#logger.error(`Could not retrieve Stripe subscription ${subscriptionId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_SUBSCRIPTION_LOOKUP_FAILED);
    }
  }

  public async findSubscriptionCustomerId(subscriptionId: string): Promise<string | null> {
    const subscription = await this.retrieveSubscription(subscriptionId);

    if (!subscription) {
      return null;
    }

    return typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer?.id ?? null);
  }
}
