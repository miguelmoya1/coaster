import { CacheKeys, CacheService } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SubscriptionActivatedEvent } from '../impl/subscription-activated.event';
import { SubscriptionCancelledEvent } from '../impl/subscription-cancelled.event';
import { SubscriptionOverriddenEvent } from '../impl/subscription-overridden.event';
import { SubscriptionPaymentFailedEvent } from '../impl/subscription-payment-failed.event';
import { SubscriptionRenewedEvent } from '../impl/subscription-renewed.event';

type SubscriptionEvent =
  | SubscriptionActivatedEvent
  | SubscriptionCancelledEvent
  | SubscriptionOverriddenEvent
  | SubscriptionPaymentFailedEvent
  | SubscriptionRenewedEvent;

@EventsHandler(
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionOverriddenEvent,
  SubscriptionPaymentFailedEvent,
  SubscriptionRenewedEvent,
)
export class ForgetSubscriptionCacheHandler implements IEventHandler<SubscriptionEvent> {
  readonly #logger = new Logger(ForgetSubscriptionCacheHandler.name);

  constructor(private readonly _cache: CacheService) {}

  async handle(event: SubscriptionEvent) {
    this.#logger.debug(`Catching subscription change for establishmentId=${event.establishmentId}...`);

    await this._cache.forget(CacheKeys.subscription(event.establishmentId));
  }
}
