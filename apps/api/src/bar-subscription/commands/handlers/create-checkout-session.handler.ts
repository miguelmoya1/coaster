import type { CreateCheckoutSessionResponse } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { DbSubscriptionStatus } from '@coaster/core/db';
import { createIntegrationIdentifier, getPriceId, StripeApi } from '@coaster/stripe';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { getCheckoutCancelUrl, getCheckoutSuccessUrl } from '../../utils/billing-urls';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';

const CHECKOUT_SESSION_TTL_SECONDS = 2 * 60 * 60;
const IDEMPOTENCY_BUCKET_MS = 30 * 60 * 1000;

/**
 * Reusing the key is what hands a user who clicks "subscribe" twice the session they already have.
 * Stripe only honours that when the payload is byte for byte the one it saw first, so every value
 * the request carries has to derive from the bucket, never from the instant of the click.
 */
const currentIdempotencyBucket = (): number => Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS);

const buildCheckoutIdempotencyKey = (barId: string, plan: string, bucket: number): string =>
  `checkout:${barId}:${plan}:${bucket}`;

/**
 * Anchored to the start of the bucket rather than to now, which leaves the session alive for
 * between 90 and 120 minutes: comfortably past the 30-minute minimum Stripe accepts.
 */
const bucketExpiresAt = (bucket: number): number =>
  Math.floor((bucket * IDEMPOTENCY_BUCKET_MS) / 1000) + CHECKOUT_SESSION_TTL_SECONDS;

@Injectable()
@CommandHandler(CreateCheckoutSessionCommand)
export class CreateCheckoutSessionHandler implements ICommandHandler<
  CreateCheckoutSessionCommand,
  CreateCheckoutSessionResponse
> {
  readonly #logger = new Logger(CreateCheckoutSessionHandler.name);

  constructor(
    private readonly _stripeApi: StripeApi,
    private readonly _configService: ConfigService,
    private readonly _readRepo: BarSubscriptionReadRepository,
  ) {}

  async execute(command: CreateCheckoutSessionCommand): Promise<CreateCheckoutSessionResponse> {
    const { barId, plan } = command;
    this.#logger.debug(`Executing CreateCheckoutSessionCommand for barId=${barId}, plan=${plan}`);

    const existing = await this._readRepo.findByBarId(barId);
    const hasStripeSubscription = Boolean(existing?.stripeSubscriptionId);
    const isPendingCancellation =
      existing?.status === DbSubscriptionStatus.CANCELED &&
      Boolean(existing.currentPeriodEnd && new Date() <= existing.currentPeriodEnd);
    const isTerminalCancellation = existing?.status === DbSubscriptionStatus.CANCELED && !isPendingCancellation;
    const hasRemoteSubscription =
      hasStripeSubscription &&
      !isTerminalCancellation &&
      (await this._stripeApi.retrieveSubscription(existing!.stripeSubscriptionId!)) !== null;

    if (hasRemoteSubscription) {
      if (isPendingCancellation) {
        this.#logger.warn(`Bar barId=${barId} has a subscription pending cancellation`);
        throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION);
      }

      this.#logger.warn(`Bar barId=${barId} already has a Stripe subscription ${existing?.stripeSubscriptionId}`);
      throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_ALREADY_EXISTS);
    }

    if (isPendingCancellation && !existing?.stripeSubscriptionId) {
      this.#logger.warn(`Bar barId=${barId} has a subscription pending cancellation`);
      throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION);
    }

    if (hasStripeSubscription && !isTerminalCancellation) {
      this.#logger.warn(
        `Ignoring stale Stripe subscription reference for barId=${barId}: ${existing?.stripeSubscriptionId}`,
      );
    }

    const priceId = getPriceId(plan, this._configService);
    const bucket = currentIdempotencyBucket();
    const idempotencyKey = buildCheckoutIdempotencyKey(barId, plan, bucket);

    const session = await this._stripeApi.createCheckoutSession(
      {
        mode: 'subscription',
        success_url: getCheckoutSuccessUrl(this._configService, barId),
        cancel_url: getCheckoutCancelUrl(this._configService, barId),
        client_reference_id: barId,
        allow_promotion_codes: true,
        expires_at: bucketExpiresAt(bucket),
        line_items: [{ price: priceId, quantity: 1 }],
        integration_identifier: createIntegrationIdentifier(idempotencyKey),
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
      existing?.stripeCustomerId,
      idempotencyKey,
    );

    if (!session.url) {
      this.#logger.error(`Stripe checkout session creation returned null URL for barId=${barId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
    }

    this.#logger.debug(`Checkout session created successfully: id=${session.id}`);

    return {
      id: session.id,
      url: session.url,
    };
  }
}
