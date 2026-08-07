import { TestBed } from '@angular/core/testing';
import type { BarId } from '@coaster/common';
import { SubscriptionPlan } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscriptionRepository } from '../data-access/bar-subscription-repository';
import { CreateCheckoutSession } from './create-checkout-session';

describe('CreateCheckoutSession', () => {
  let service: CreateCheckoutSession;

  const repositoryMock = {
    createCheckoutSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: BarSubscriptionRepository, useValue: repositoryMock }],
    });
    service = TestBed.inject(CreateCheckoutSession);

    window.history.pushState({}, '', '/test?q=1');
  });

  it('should return undefined if barId is undefined', async () => {
    const result = await service.execute(undefined);
    expect(result).toBeUndefined();
  });

  it('should create a checkout session and return url', async () => {
    repositoryMock.createCheckoutSession.mockResolvedValue({ url: 'http://stripe.checkout' });

    const result = await service.execute('bar-1' as BarId, SubscriptionPlan.PRO);

    expect(result).toBe('http://stripe.checkout');
    expect(repositoryMock.createCheckoutSession).toHaveBeenCalledWith('bar-1' as BarId, {
      plan: SubscriptionPlan.PRO,
    });
  });

  it('should propagate errors so the interceptor can translate them', async () => {
    repositoryMock.createCheckoutSession.mockRejectedValue(new Error('test error'));

    await expect(service.execute('bar-1' as BarId)).rejects.toThrow('test error');
  });
});
