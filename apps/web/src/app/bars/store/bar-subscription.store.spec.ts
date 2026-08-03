import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Socket } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscription } from '../services/bar-subscription';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';
import { BarSubscriptionStore } from './bar-subscription.store';
import { CurrentBarStore } from './current-bar.store';

describe('BarSubscriptionStore', () => {
  let store: BarSubscriptionStore;
  const socketSignal = signal<{ barId: string } | null>(null);

  beforeEach(() => {
    socketSignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        BarSubscriptionStore,
        {
          provide: CurrentBarStore,
          useValue: {
            currentId: signal('bar-1'),
          },
        },
        {
          provide: BarSubscription,
          useValue: {
            execute: vi.fn(),
          },
        },
        {
          provide: CreateCustomerPortalSession,
          useValue: {
            execute: vi.fn(),
          },
        },
        {
          provide: CreateCheckoutSession,
          useValue: {
            execute: vi.fn(),
          },
        },
        {
          provide: Socket,
          useValue: {
            subscriptionUpdated: socketSignal,
          },
        },
      ],
    });

    store = TestBed.inject(BarSubscriptionStore);
  });

  it('should calculate isReadOnly correctly', () => {
    expect(store.isReadOnly()).toBe(false);
  });
});
