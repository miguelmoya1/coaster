import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, Order } from '@coaster/common';
import { asEstablishmentId } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { statsResource } from './stats.resource';

const establishmentId = asEstablishmentId('establishment-1');
const url = `/establishments/${establishmentId}/stats`;

describe('statsResource', () => {
  const realtime = {
    orderClosed: signal<Order | null>(null),
    orderCancelled: signal<{ id: string } | null>(null),
    orderDeleted: signal<{ id: string } | null>(null),
  };

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });
  });

  it('should not ask for the takings of someone who cannot see them', () => {
    TestBed.runInInjectionContext(() => statsResource(signal<EstablishmentId | undefined>(undefined)));
    TestBed.tick();

    TestBed.inject(HttpTestingController).expectNone(url);
  });

  it('should add the takings up again whenever an order is paid, cancelled or deleted', async () => {
    const http = TestBed.inject(HttpTestingController);
    const stats = TestBed.runInInjectionContext(() =>
      statsResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    http.expectOne(url).flush({ todayRevenue: 0 });
    await vi.waitFor(() => expect(stats.hasValue()).toBe(true));

    realtime.orderClosed.set({ id: 'order-1' } as Order);
    TestBed.tick();

    http.expectOne(url);
  });
});
