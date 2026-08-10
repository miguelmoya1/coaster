import type { EstablishmentId } from '@coaster/common';
import { ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCheckoutSessionCommand } from '../impl/create-checkout-session.command';
import { CreateCheckoutSessionHandler } from './create-checkout-session.handler';

describe('CreateCheckoutSessionHandler (establishment-subscription)', () => {
  let handler: CreateCheckoutSessionHandler;
  let stripeApiMock: any;
  let configServiceMock: any;
  let readRepoMock: any;

  const establishmentId = 'establishment_123' as EstablishmentId;

  beforeEach(() => {
    stripeApiMock = {
      createCheckoutSession: vi.fn().mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' }),
      retrieveSubscription: vi.fn().mockResolvedValue(null),
    };

    configServiceMock = {
      get: vi.fn().mockImplementation((key: string) => (key === 'STRIPE_PRICE_PRO' ? 'price_monthly' : undefined)),
    };

    readRepoMock = {
      findByEstablishmentId: vi.fn(),
    };

    handler = new CreateCheckoutSessionHandler(stripeApiMock, configServiceMock, readRepoMock);
  });

  it('should reuse existing stripeCustomerId and create checkout session', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });

    const result = await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

    expect(stripeApiMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: establishmentId,
        line_items: [{ price: 'price_monthly', quantity: 1 }],
      }),
      'cus_existing',
      expect.stringContaining(`checkout:${establishmentId}:${SubscriptionPlan.PRO}:`),
    );
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should reuse one idempotency key across repeated purchases so Stripe returns the same session', async () => {
    await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));
    await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

    const [firstKey, secondKey] = stripeApiMock.createCheckoutSession.mock.calls.map(
      (call: unknown[]) => call[2] as string,
    );

    expect(firstKey).toBe(secondKey);
  });

  it('should send an identical payload with the reused key, since Stripe rejects a key whose request changed', async () => {
    vi.useFakeTimers();

    try {
      // Start of a 30-minute bucket, then a click a few minutes later inside that same bucket.
      vi.setSystemTime(new Date('2026-08-06T10:00:00.000Z'));
      await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

      vi.advanceTimersByTime(7 * 60 * 1000);
      await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));
    } finally {
      vi.useRealTimers();
    }

    const [first, second] = stripeApiMock.createCheckoutSession.mock.calls;

    expect(second[2]).toBe(first[2]);
    expect(second[0]).toEqual(first[0]);
  });

  it('should key separate establishments apart so one never reuses another establishment session', async () => {
    await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));
    await handler.execute(
      new CreateCheckoutSessionCommand('establishment_other' as EstablishmentId, SubscriptionPlan.PRO),
    );

    const [firstKey, secondKey] = stripeApiMock.createCheckoutSession.mock.calls.map(
      (call: unknown[]) => call[2] as string,
    );

    expect(firstKey).not.toBe(secondKey);
  });

  it('should expire the session well inside the idempotency window', async () => {
    await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

    const { expires_at: expiresAt } = stripeApiMock.createCheckoutSession.mock.calls.at(-1)[0];
    const secondsFromNow = expiresAt - Math.floor(Date.now() / 1000);

    expect(secondsFromNow).toBeGreaterThan(30 * 60);
    expect(secondsFromNow).toBeLessThanOrEqual(2 * 60 * 60);
  });

  it('should let Stripe create the customer if no stripeCustomerId exists', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue(null);

    const result = await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

    expect(stripeApiMock.createCheckoutSession).toHaveBeenCalledWith(expect.any(Object), undefined, expect.any(String));
    expect(result).toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/pay' });
  });

  it('should carry the establishmentId in metadata so webhooks can resolve the establishment', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue(null);

    await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

    const [params] = stripeApiMock.createCheckoutSession.mock.calls[0];
    expect(params.metadata).toEqual({ establishmentId, plan: SubscriptionPlan.PRO });
    expect(params.subscription_data.metadata).toEqual({ establishmentId, plan: SubscriptionPlan.PRO });
  });

  it('should throw InternalServerErrorException if session url is missing', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({ stripeCustomerId: 'cus_existing' });
    stripeApiMock.createCheckoutSession.mockResolvedValue({ id: 'cs_123', url: null });

    await expect(
      handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO)),
    ).rejects.toThrow(new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED));
  });

  it('should reject when the establishment already has a live Stripe subscription', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_live',
      status: 'ACTIVE',
    });
    stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_live' });

    await expect(
      handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_ALREADY_EXISTS));
    expect(stripeApiMock.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should reject while a cancellation is still pending', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_live',
      status: 'CANCELED',
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    stripeApiMock.retrieveSubscription.mockResolvedValue({ id: 'sub_live' });

    await expect(
      handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.STRIPE_SUBSCRIPTION_PENDING_CANCELLATION));
  });

  it('should recover from a stale subscription reference without writing the database', async () => {
    readRepoMock.findByEstablishmentId.mockResolvedValue({
      stripeCustomerId: null,
      stripeSubscriptionId: 'sub_stale',
      status: 'ACTIVE',
    });
    stripeApiMock.retrieveSubscription.mockResolvedValue(null);
    stripeApiMock.createCheckoutSession.mockResolvedValue({
      id: 'cs_recovery',
      url: 'https://checkout.stripe.com/recovery',
    });

    const result = await handler.execute(new CreateCheckoutSessionCommand(establishmentId, SubscriptionPlan.PRO));

    expect(result.url).toBe('https://checkout.stripe.com/recovery');
    expect(stripeApiMock.createCheckoutSession).toHaveBeenCalledWith(expect.any(Object), null, expect.any(String));
  });
});
