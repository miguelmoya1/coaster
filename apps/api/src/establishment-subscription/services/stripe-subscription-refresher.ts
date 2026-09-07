import { SecurityRepository, SubscriptionRefresher, SubscriptionState } from '@coaster/core';
import { StripeApi, toSubscriptionSnapshot } from '@coaster/stripe';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeSubscriptionRefresher implements SubscriptionRefresher {
  readonly #logger = new Logger(StripeSubscriptionRefresher.name);

  constructor(
    private readonly _stripeApi: StripeApi,
    private readonly _securityRepository: SecurityRepository,
    private readonly _configService: ConfigService,
  ) {}

  async refresh(establishmentId: string): Promise<SubscriptionState | null> {
    const stored = await this._securityRepository.getSubscriptionState(establishmentId);

    if (!stored?.stripeSubscriptionId) {
      return stored;
    }

    const remote = await this._stripeApi.retrieveSubscription(stored.stripeSubscriptionId);

    if (!remote) {
      return stored;
    }

    const { plan: _plan, isCancellation: _isCancellation, ...snapshot } = toSubscriptionSnapshot(
      remote,
      this._configService,
    );

    this.#logger.warn(
      `The stored subscription for establishmentId=${establishmentId} disagreed with Stripe and was refreshed: ` +
        `${stored.status} -> ${snapshot.status}`,
    );

    return this._securityRepository.refreshSubscriptionState(establishmentId, snapshot);
  }
}
