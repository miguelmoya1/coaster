import { TestBed } from '@angular/core/testing';
import type { EstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSubscriptionRepository } from '../data-access/establishment-subscription-repository';
import { CreateCustomerPortalSession } from './create-customer-portal-session';

describe('CreateCustomerPortalSession', () => {
  let service: CreateCustomerPortalSession;

  const repositoryMock = {
    createCustomerPortalSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: EstablishmentSubscriptionRepository, useValue: repositoryMock }],
    });
    service = TestBed.inject(CreateCustomerPortalSession);
  });

  it('should return undefined if establishmentId is undefined', async () => {
    const result = await service.execute(undefined);
    expect(result).toBeUndefined();
  });

  it('should create a portal session and return url', async () => {
    repositoryMock.createCustomerPortalSession.mockResolvedValue({ url: 'http://stripe.portal' });

    const result = await service.execute('establishment-1' as EstablishmentId);

    expect(result).toBe('http://stripe.portal');
    expect(repositoryMock.createCustomerPortalSession).toHaveBeenCalledWith('establishment-1' as EstablishmentId, {});
  });

  it('should propagate errors so the interceptor can translate them', async () => {
    repositoryMock.createCustomerPortalSession.mockRejectedValue(new Error('test error'));

    await expect(service.execute('establishment-1' as EstablishmentId)).rejects.toThrow('test error');
  });
});
