import type { CreateCheckoutSessionResponse } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { DbSubscriptionStatus } from '@coaster/core/db';
import { createIntegrationIdentifier, getPriceId, StripeApi } from '@coaster/stripe';
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { getCheckoutCancelUrl, getCheckoutSuccessUrl } from '../../utils/billing-urls';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';

const CHECKOUT_SESSION_TTL_SECONDS = 2 * 60 * 60;
const IDEMPOTENCY_BUCKET_MS = 30 * 60 * 1000;

const currentIdempotencyBucket = (): number => Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS);

const buildCheckoutIdempotencyKey = (establishmentId: string, plan: string, bucket: number): string =>
  `checkout:${establishmentId}:${plan}:${bucket}`;

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
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
  ) {}

  async execute(command: CreateCheckoutSessionCommand): Promise<CreateCheckoutSessionResponse> {
    const { establishmentId, plan } = command;
    this.#logger.debug(`Executing CreateCheckoutSessionCommand for establishmentId=${establishmentId}, plan=${plan}`);

    const existing = await this._readRepo.findByEstablishmentId(establishmentId);
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
        this.#logger.warn(`Establishment establishmentId=${establishmentId} has a subscription pending cancellation`);
        throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION);
      }

      this.#logger.warn(
        `Establishment establishmentId=${establishmentId} already has a Stripe subscription ${existing?.stripeSubscriptionId}`,
      );
      throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_ALREADY_EXISTS);
    }

    if (isPendingCancellation && !existing?.stripeSubscriptionId) {
      this.#logger.warn(`Establishment establishmentId=${establishmentId} has a subscription pending cancellation`);
      throw new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION);
    }

    if (hasStripeSubscription && !isTerminalCancellation) {
      this.#logger.warn(
        `Ignoring stale Stripe subscription reference for establishmentId=${establishmentId}: ${existing?.stripeSubscriptionId}`,
      );
    }

    const priceId = getPriceId(plan, this._configService);
    const bucket = currentIdempotencyBucket();
    const idempotencyKey = buildCheckoutIdempotencyKey(establishmentId, plan, bucket);

    const session = await this._stripeApi.createCheckoutSession(
      {
        mode: 'subscription',
        success_url: getCheckoutSuccessUrl(this._configService, establishmentId),
        cancel_url: getCheckoutCancelUrl(this._configService, establishmentId),
        client_reference_id: establishmentId,
        allow_promotion_codes: true,
        expires_at: bucketExpiresAt(bucket),
        line_items: [{ price: priceId, quantity: 1 }],
        integration_identifier: createIntegrationIdentifier(idempotencyKey),
        metadata: {
          establishmentId,
          plan,
        },
        subscription_data: {
          metadata: {
            establishmentId,
            plan,
          },
        },
      },
      existing?.stripeCustomerId,
      idempotencyKey,
    );

    if (!session.url) {
      this.#logger.error(`Stripe checkout session creation returned null URL for establishmentId=${establishmentId}`);
      throw new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
    }

    this.#logger.debug(`Checkout session created successfully: id=${session.id}`);

    return {
      id: session.id,
      url: session.url,
    };
  }
}
