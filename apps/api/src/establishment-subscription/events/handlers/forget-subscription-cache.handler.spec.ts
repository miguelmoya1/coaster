import { CacheService } from '@coaster/core';
import { asEstablishmentId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionActivatedEvent } from '../impl/subscription-activated.event';
import { SubscriptionCancelledEvent } from '../impl/subscription-cancelled.event';
import { SubscriptionOverriddenEvent } from '../impl/subscription-overridden.event';
import { SubscriptionPaymentFailedEvent } from '../impl/subscription-payment-failed.event';
import { SubscriptionRenewedEvent } from '../impl/subscription-renewed.event';
import { ForgetSubscriptionCacheHandler } from './forget-subscription-cache.handler';

describe('ForgetSubscriptionCacheHandler', () => {
  const cache = { forget: vi.fn(), remember: vi.fn() };
  let handler: ForgetSubscriptionCacheHandler;

  const establishmentId = asEstablishmentId('establishment-1');
  const key = 'establishment:establishment-1:subscription';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    handler = new ForgetSubscriptionCacheHandler(cache as unknown as CacheService);
  });

  it.each([
    ['just paid at checkout', new SubscriptionActivatedEvent(establishmentId, 'sub_123')],
    ['renewed', new SubscriptionRenewedEvent(establishmentId, 'sub_123')],
    ['cancelled', new SubscriptionCancelledEvent(establishmentId, 'sub_123')],
    ['failed to pay', new SubscriptionPaymentFailedEvent(establishmentId, 'cus_123')],
    ['granted by an admin', new SubscriptionOverriddenEvent(establishmentId)],
  ])('should drop the subscription when an establishment has %s', async (_case, event) => {
    await handler.handle(event);

    expect(cache.forget).toHaveBeenCalledWith(key);
  });
});
