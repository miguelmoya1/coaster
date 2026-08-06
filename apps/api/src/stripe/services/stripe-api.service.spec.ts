import { ErrorCodes } from '@coaster/common';
import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StripeClient } from '../utils/stripe-client.provider';
import { StripeApi } from './stripe-api.service';

const resourceMissing = (resource: string, id: string) => ({
  code: 'resource_missing',
  param: resource,
  message: `No such ${resource}: ${id}`,
});

describe('StripeApi', () => {
  let stripeApi: StripeApi;
  let clientMock: any;

  beforeEach(() => {
    clientMock = {
      checkout: { sessions: { create: vi.fn() } },
      billingPortal: { sessions: { create: vi.fn() } },
      subscriptions: { retrieve: vi.fn() },
    };

    stripeApi = new StripeApi({ client: clientMock } as unknown as StripeClient);
  });

  describe('createCheckoutSession', () => {
    it('should attach the customer when one is provided', async () => {
      clientMock.checkout.sessions.create.mockResolvedValue({ id: 'cs_1' });

      await stripeApi.createCheckoutSession({ mode: 'subscription' } as any, 'cus_1');

      expect(clientMock.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_1' }));
    });

    it('should omit the customer when none is provided', async () => {
      clientMock.checkout.sessions.create.mockResolvedValue({ id: 'cs_1' });

      await stripeApi.createCheckoutSession({ mode: 'subscription' } as any);

      expect(clientMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ customer: expect.anything() }),
      );
    });

    it('should retry without the customer when the stored customer no longer exists', async () => {
      clientMock.checkout.sessions.create
        .mockRejectedValueOnce(resourceMissing('customer', 'cus_stale'))
        .mockResolvedValueOnce({ id: 'cs_recovery' });

      const session = await stripeApi.createCheckoutSession({ mode: 'subscription' } as any, 'cus_stale');

      expect(session).toEqual({ id: 'cs_recovery' });
      expect(clientMock.checkout.sessions.create).toHaveBeenCalledTimes(2);
      expect(clientMock.checkout.sessions.create.mock.calls[1][0]).not.toHaveProperty('customer');
    });

    it('should map an unrelated failure to STRIPE_CHECKOUT_SESSION_FAILED', async () => {
      clientMock.checkout.sessions.create.mockRejectedValue(new Error('Stripe unavailable'));

      await expect(stripeApi.createCheckoutSession({ mode: 'subscription' } as any)).rejects.toThrow(
        new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED),
      );
    });

    it('should map a failed retry to STRIPE_CHECKOUT_SESSION_FAILED', async () => {
      clientMock.checkout.sessions.create
        .mockRejectedValueOnce(resourceMissing('customer', 'cus_stale'))
        .mockRejectedValueOnce(new Error('still broken'));

      await expect(stripeApi.createCheckoutSession({ mode: 'subscription' } as any, 'cus_stale')).rejects.toThrow(
        new InternalServerErrorException(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED),
      );
    });
  });

  describe('createBillingPortalSession', () => {
    it('should return the portal url', async () => {
      clientMock.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal.stripe.com' });

      const session = await stripeApi.createBillingPortalSession('cus_1', 'https://app.example.com');

      expect(clientMock.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_1',
        return_url: 'https://app.example.com',
      });
      expect(session).toEqual({ url: 'https://portal.stripe.com' });
    });

    it('should return null when the customer no longer exists', async () => {
      clientMock.billingPortal.sessions.create.mockRejectedValue(resourceMissing('customer', 'cus_stale'));

      await expect(stripeApi.createBillingPortalSession('cus_stale', 'https://app.example.com')).resolves.toBeNull();
    });

    it('should map an unrelated failure to STRIPE_BILLING_PORTAL_FAILED', async () => {
      clientMock.billingPortal.sessions.create.mockRejectedValue(new Error('Stripe unavailable'));

      await expect(stripeApi.createBillingPortalSession('cus_1', 'https://app.example.com')).rejects.toThrow(
        new InternalServerErrorException(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED),
      );
    });
  });

  describe('retrieveSubscription', () => {
    it('should return null when the subscription no longer exists', async () => {
      clientMock.subscriptions.retrieve.mockRejectedValue(resourceMissing('subscription', 'sub_stale'));

      await expect(stripeApi.retrieveSubscription('sub_stale')).resolves.toBeNull();
    });

    it('should map an unrelated failure to STRIPE_SUBSCRIPTION_LOOKUP_FAILED', async () => {
      clientMock.subscriptions.retrieve.mockRejectedValue(new Error('Stripe unavailable'));

      await expect(stripeApi.retrieveSubscription('sub_1')).rejects.toThrow(
        new InternalServerErrorException(ErrorCodes.STRIPE_SUBSCRIPTION_LOOKUP_FAILED),
      );
    });
  });

  describe('findSubscriptionCustomerId', () => {
    it('should resolve the customer id from a string reference', async () => {
      clientMock.subscriptions.retrieve.mockResolvedValue({ customer: 'cus_remote' });

      await expect(stripeApi.findSubscriptionCustomerId('sub_1')).resolves.toBe('cus_remote');
    });

    it('should resolve the customer id from an expanded customer object', async () => {
      clientMock.subscriptions.retrieve.mockResolvedValue({ customer: { id: 'cus_remote' } });

      await expect(stripeApi.findSubscriptionCustomerId('sub_1')).resolves.toBe('cus_remote');
    });

    it('should return null when the subscription is gone', async () => {
      clientMock.subscriptions.retrieve.mockRejectedValue(resourceMissing('subscription', 'sub_stale'));

      await expect(stripeApi.findSubscriptionCustomerId('sub_stale')).resolves.toBeNull();
    });
  });
});
