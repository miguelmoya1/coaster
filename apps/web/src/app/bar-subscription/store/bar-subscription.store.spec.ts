import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { BarId } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Socket } from '@coaster/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscription } from '../services/bar-subscription';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';
import { BarSubscriptionStore } from './bar-subscription.store';

describe('BarSubscriptionStore', () => {
  let store: BarSubscriptionStore;
  let httpMock: HttpTestingController;
  const socketSignal = signal<{ barId: string } | null>(null);

  const barId = 'bar-1' as BarId;
  const url = `/bars/${barId}/bar-subscription`;

  const activeSubscription = {
    id: 'sub-1',
    barId,
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
    socketSignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        BarSubscriptionStore,
        {
          provide: BarSubscription,
          useValue: { execute: (id?: BarId) => (id ? `/bars/${id}/bar-subscription` : undefined) },
        },
        { provide: CreateCustomerPortalSession, useValue: { execute: vi.fn() } },
        { provide: CreateCheckoutSession, useValue: { execute: vi.fn() } },
        { provide: Socket, useValue: { subscriptionUpdated: socketSignal } },
      ],
    });

    store = TestBed.inject(BarSubscriptionStore);
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

      store.setBarId(barId);
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

      store.setBarId(barId);
      await store.createCustomerPortalSession();

      expect(store.isOpeningBillingPortal()).toBe(true);
    });

    it('should release the busy flag when the portal cannot be opened', async () => {
      const portal = TestBed.inject(CreateCustomerPortalSession) as unknown as { execute: ReturnType<typeof vi.fn> };
      portal.execute.mockRejectedValue(new Error('stripe down'));

      store.setBarId(barId);
      await expect(store.createCustomerPortalSession()).rejects.toThrow('stripe down');

      expect(store.isOpeningBillingPortal()).toBe(false);
    });
  });

  describe('isReadOnly', () => {
    it('should not lock the workspace before a bar is selected', () => {
      expect(store.isReadOnly()).toBe(false);
    });

    it('should not lock the workspace while the subscription is loading', () => {
      store.setBarId(barId);
      TestBed.tick();

      httpMock.expectOne(url);

      expect(store.isReadOnly()).toBe(false);
    });

    it('should lock the workspace when the subscription cannot be loaded', async () => {
      store.setBarId(barId);
      TestBed.tick();

      httpMock.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.isReadOnly()).toBe(true);
    });

    it('should not lock the workspace for an active subscription', async () => {
      store.setBarId(barId);
      TestBed.tick();

      httpMock.expectOne(url).flush(activeSubscription);
      TestBed.tick();
      await Promise.resolve();
      TestBed.tick();

      expect(store.isReadOnly()).toBe(false);
    });

    it('should lock the workspace for an inactive subscription', async () => {
      store.setBarId(barId);
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
});
