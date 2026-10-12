import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Order } from '@coaster/orders';
import { asEstablishmentId, Realtime, type EstablishmentId } from '@coaster/core';
import { fakeRealtime } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cashClosePreviewResource, cashClosesResource } from './cash-close.resources';

const establishmentId = asEstablishmentId('establishment-1');
const url = `/establishments/${establishmentId}/cash-closes/preview`;

describe('cashClosePreviewResource', () => {
  const realtime = {
    orderCreated: signal<Order | null>(null),
    orderUpdated: signal<Order | null>(null),
    orderClosed: signal<Order | null>(null),
    orderCancelled: signal<{ id: string } | null>(null),
    orderDeleted: signal<{ id: string } | null>(null),
  };
  const reconnected = signal(0);

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Realtime, useValue: fakeRealtime({ ...realtime, reconnected }) },
      ],
    });
  });

  const loaded = async () => {
    const http = TestBed.inject(HttpTestingController);
    const preview = TestBed.runInInjectionContext(() =>
      cashClosePreviewResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    http.expectOne(url).flush({ cashAmount: 0 });
    await vi.waitFor(() => expect(preview.hasValue()).toBe(true));
    return http;
  };

  it('should ask again for what the till holds whenever an order is paid, and not for old news', async () => {
    realtime.orderClosed.set({ id: 'before-opening' } as Order);
    const http = await loaded();
    TestBed.tick();
    http.expectNone(url);

    realtime.orderClosed.set({ id: 'just-paid' } as Order);
    TestBed.tick();

    http.expectOne(url);
  });

  it('should ask again for what the till holds when the stream comes back, in case it missed a payment', async () => {
    const http = await loaded();

    reconnected.update((count) => count + 1);
    TestBed.tick();

    http.expectOne(url);
  });
});

describe('cashClosesResource', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('should ask for the closes of the day it is given, and again when the day changes', () => {
    const http = TestBed.inject(HttpTestingController);
    const date = signal('2026-09-27');
    TestBed.runInInjectionContext(() => cashClosesResource(signal<EstablishmentId | undefined>(establishmentId), date));
    TestBed.tick();

    http.expectOne(`/establishments/${establishmentId}/cash-closes?date=2026-09-27`).flush([]);

    date.set('2026-09-26');
    TestBed.tick();

    http.expectOne(`/establishments/${establishmentId}/cash-closes?date=2026-09-26`);
  });
});
