import { TestBed } from '@angular/core/testing';
import type { BarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { BarSubscription } from './bar-subscription';

describe('BarSubscription', () => {
  let service: BarSubscription;

  const repositoryMock = {
    routes: {
      getSubscription: vi.fn((barId: string) => `/bars/${barId}/subscription`),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: BarRepository, useValue: repositoryMock },
      ],
    });
    service = TestBed.inject(BarSubscription);
  });

  it('should return undefined if barId is undefined', () => {
    expect(service.execute(undefined)).toBeUndefined();
  });

  it('should return the subscription route', () => {
    expect(service.execute('bar-1' as BarId)).toBe('/bars/bar-1/subscription');
  });
});
