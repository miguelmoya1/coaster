import { TestBed } from '@angular/core/testing';
import type { BarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarSubscriptionRepository } from '../data-access/bar-subscription-repository';
import { CreateCustomerPortalSession } from './create-customer-portal-session';

describe('CreateCustomerPortalSession', () => {
  let service: CreateCustomerPortalSession;

  const repositoryMock = {
    createCustomerPortalSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: BarSubscriptionRepository, useValue: repositoryMock }],
    });
    service = TestBed.inject(CreateCustomerPortalSession);
  });

  it('should return undefined if barId is undefined', async () => {
    const result = await service.execute(undefined);
    expect(result).toBeUndefined();
  });

  it('should create a portal session and return url', async () => {
    repositoryMock.createCustomerPortalSession.mockResolvedValue({ url: 'http://stripe.portal' });

    const result = await service.execute('bar-1' as BarId);

    expect(result).toBe('http://stripe.portal');
    expect(repositoryMock.createCustomerPortalSession).toHaveBeenCalledWith('bar-1' as BarId, {});
  });

  it('should propagate errors so the interceptor can translate them', async () => {
    repositoryMock.createCustomerPortalSession.mockRejectedValue(new Error('test error'));

    await expect(service.execute('bar-1' as BarId)).rejects.toThrow('test error');
  });
});
