import { TestBed } from '@angular/core/testing';
import type { EstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentSubscriptionRepository } from '../data-access/establishment-subscription-repository';
import { EstablishmentSubscription } from './establishment-subscription';

describe('EstablishmentSubscription', () => {
  let service: EstablishmentSubscription;

  const repositoryMock = {
    routes: {
      getSubscription: vi.fn((establishmentId: string) => `/establishments/${establishmentId}/subscription`),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: EstablishmentSubscriptionRepository, useValue: repositoryMock }],
    });
    service = TestBed.inject(EstablishmentSubscription);
  });

  it('should return undefined if establishmentId is undefined', () => {
    expect(service.execute(undefined)).toBeUndefined();
  });

  it('should return the subscription route', () => {
    expect(service.execute('establishment-1' as EstablishmentId)).toBe('/establishments/establishment-1/subscription');
  });
});
