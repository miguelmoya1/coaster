import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSubscription } from '../services/establishment-subscription';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';
import { EstablishmentSubscriptionStore } from './establishment-subscription.store';

describe('EstablishmentSubscriptionStore', () => {
  let store: EstablishmentSubscriptionStore;
  let httpMock: HttpTestingController;
  const realtimeSignal = signal<{ establishmentId: string } | null>(null);

  const establishmentId = 'establishment-1' as EstablishmentId;
  const url = `/establishments/${establishmentId}/establishment-subscription`;

  const activeSubscription = {
    id: 'sub-1',
    establishmentId,
    plan: SubscriptionPlan.PRO,
    status: SubscriptionStatus.ACTIVE,
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: 'sub_1',
    currentPeriodStart: new Date(Date.now() - 86_400_000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    realtimeSignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        EstablishmentSubscriptionStore,
        {
          provide: EstablishmentSubscription,
          useValue: {
            execute: (id?: EstablishmentId) => (id ? `/establishments/${id}/establishment-subscription` : undefined),
          },
        },
        { provide: CreateCustomerPortalSession, useValue: { execute: vi.fn() } },
        { provide: CreateCheckoutSession, useValue: { execute: vi.fn() } },
        { provide: Realtime, useValue: { subscriptionUpdated: realtimeSignal } },
      ],
    });

    store = TestBed.inject(EstablishmentSubscriptionStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createCustomerPortalSession', () => {
    it('should ignore a second call while the first is still in flight', async () => {
      const portal = TestBed.inject(CreateCustomerPortalSession) as unknown as { execute: ReturnType<typeof vi.fn> };
      let release: (url: string) => void = () => undefined;
      portal.execute.mockReturnValue(new Promise<string>((resolve) => (release = resolve)));

      store.setEstablishmentId(establishmentId);
      const first = store.createCustomerPortalSession();

      expect(store.isOpeningBillingPortal()).toBe(true);

      await expect(store.createCustomerPortalSession()).resolves.toBeUndefined();
      expect(portal.execute).toHaveBeenCalledTimes(1);

      release('https://portal.stripe.com');
      await expect(first).resolves.toBe('https://portal.stripe.com');
    });

    it('should stay busy after success so the button cannot be clicked while navigating', async () => {
      const portal = TestBed.inject(CreateCustomerPortalSession) as unknown as { execute: ReturnType<typeof vi.fn> };
      portal.execute.mockResolvedValue('https://portal.stripe.com');

      store.setEstablishmentId(establishmentId);
      await store.createCustomerPortalSession();

      expect(store.isOpeningBillingPortal()).toBe(true);
    });

    it('should release the busy flag when the portal cannot be opened', async () => {
      const portal = TestBed.inject(CreateCustomerPortalSession) as unknown as { execute: ReturnType<typeof vi.fn> };
      portal.execute.mockRejectedValue(new Error('stripe down'));

      store.setEstablishmentId(establishmentId);
      await expect(store.createCustomerPortalSession()).rejects.toThrow('stripe down');

      expect(store.isOpeningBillingPortal()).toBe(false);
    });
  });

  describe('isReadOnly', () => {
    it('should not lock the workspace before an establishment is selected', () => {
      expect(store.isReadOnly()).toBe(false);
    });

    it('should not lock the workspace while the subscription is loading', () => {
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      httpMock.expectOne(url);

      expect(store.isReadOnly()).toBe(false);
    });

    it('should not lock the workspace when the subscription cannot be loaded, since the API is the authority', async () => {
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      httpMock.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.isReadOnly()).toBe(false);
    });

    it('should not lock the workspace for an active subscription', async () => {
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      httpMock.expectOne(url).flush(activeSubscription);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.isReadOnly()).toBe(false);
    });

    it('should lock the workspace for an inactive subscription', async () => {
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      httpMock
        .expectOne(url)
        .flush({ ...activeSubscription, status: SubscriptionStatus.INACTIVE, stripeSubscriptionId: null });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.isReadOnly()).toBe(true);
    });
  });

  describe('billingAction', () => {
    const load = async (subscription: unknown) => {
      store.setEstablishmentId(establishmentId);
      TestBed.tick();

      httpMock.expectOne(url).flush(subscription as string);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();
    };

    it('should offer to manage an active subscription', async () => {
      await load(activeSubscription);

      expect(store.billingAction()).toBe('MANAGE');
    });

    it('should still offer to manage a subscription cancelled but inside its paid period', async () => {
      await load({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });

      expect(store.isReadOnly()).toBe(false);
      expect(store.billingAction()).toBe('MANAGE');
    });

    it('should offer to activate once a cancelled subscription has actually lapsed', async () => {
      await load({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELED,
        stripeSubscriptionId: null,
        canceledAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
        currentPeriodEnd: new Date(Date.now() - 86_400_000).toISOString(),
      });

      expect(store.billingAction()).toBe('ACTIVATE');
    });

    it('should offer to activate when the establishment never had a Stripe subscription', async () => {
      await load({
        ...activeSubscription,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      });

      expect(store.billingAction()).toBe('ACTIVATE');
    });

    it('should offer to manage a Stripe trial so the customer can cancel or change card', async () => {
      await load({
        ...activeSubscription,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      });

      expect(store.billingAction()).toBe('MANAGE');
    });

    it('should keep pushing checkout while the workspace is locked for non-payment', async () => {
      await load({ ...activeSubscription, status: SubscriptionStatus.PAST_DUE });

      expect(store.isReadOnly()).toBe(true);
      expect(store.billingAction()).toBe('ACTIVATE');
    });
  });
});
