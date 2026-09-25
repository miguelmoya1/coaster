import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, Order } from '@coaster/common';
import { asEstablishmentId } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cashClosePreviewResource } from './cash-close.resources';

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

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });
  });

  it('should ask again for what the till holds whenever an order is paid, and not for old news', async () => {
    realtime.orderClosed.set({ id: 'before-opening' } as Order);
    const http = TestBed.inject(HttpTestingController);
    const preview = TestBed.runInInjectionContext(() =>
      cashClosePreviewResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    http.expectOne(url).flush({ cashAmount: 0 });
    await vi.waitFor(() => expect(preview.hasValue()).toBe(true));
    TestBed.tick();
    http.expectNone(url);

    realtime.orderClosed.set({ id: 'just-paid' } as Order);
    TestBed.tick();

    http.expectOne(url);
  });
});
