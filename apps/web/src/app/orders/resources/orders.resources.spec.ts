import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, Order, OrderId } from '@coaster/common';
import { asEstablishmentId, asOrderId, OrderStatus } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openOrdersResource } from './open-orders.resource';
import { orderHistoryResource } from './order-history.resource';
import { orderResource } from './order.resource';

const establishmentId = asEstablishmentId('establishment-1');

const order = (id: string, overrides: Partial<Order> = {}): Order =>
  ({
    id: asOrderId(id),
    establishmentId,
    status: OrderStatus.OPEN,
    totalAmount: 1000,
    orderTotal: 1100,
    payableTotal: 1100,
    tipAmount: 0,
    items: [],
    createdAt: '2026-09-24T12:00:00.000Z',
    ...overrides,
  }) as Order;

describe('order resources', () => {
  let http: HttpTestingController;

  const realtime = {
    orderCreated: signal<Order | null>(null),
    orderUpdated: signal<Order | null>(null),
    orderClosed: signal<Order | null>(null),
    orderCancelled: signal<{ id: string } | null>(null),
    orderItemAdded: signal<Order | null>(null),
    orderDeleted: signal<{ id: string } | null>(null),
    orderTipUpdated: signal<{ orderId: string; tipAmount: number } | null>(null),
    orderAdjustmentsUpdated: signal<{ orderId: string; adjustments: unknown[] } | null>(null),
  };

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });

    http = TestBed.inject(HttpTestingController);
  });

  const loaded = async <T>(resource: { hasValue(): boolean; value(): T }, url: string, body: object) => {
    TestBed.tick();
    http.expectOne(url).flush(body);
    await vi.waitFor(() => expect(resource.hasValue()).toBe(true));
  };

  describe('openOrdersResource', () => {
    const url = `/establishments/${establishmentId}/orders?status=${OrderStatus.OPEN}`;

    const create = () =>
      TestBed.runInInjectionContext(() => openOrdersResource(signal<EstablishmentId | undefined>(establishmentId)));

    it('should not ask for anything until it knows the establishment', () => {
      TestBed.runInInjectionContext(() => openOrdersResource(signal<EstablishmentId | undefined>(undefined)));
      TestBed.tick();

      http.expectNone(() => true);
    });

    it('should not let an event from before the page opened overwrite what it is loading', async () => {
      realtime.orderCreated.set(order('stale'));
      const orders = create();

      await loaded(orders, url, [order('a')]);

      expect(orders.value()?.map((o) => o.id)).toEqual(['a']);
    });

    it('should add a new order, and drop one as soon as it is paid', async () => {
      const orders = create();
      await loaded(orders, url, [order('a')]);

      realtime.orderCreated.set(order('b'));
      TestBed.tick();
      expect(orders.value()?.map((o) => o.id)).toEqual(['a', 'b']);

      realtime.orderClosed.set(order('a', { status: OrderStatus.CLOSED }));
      TestBed.tick();
      expect(orders.value()?.map((o) => o.id)).toEqual(['b']);
    });

    it('should ignore orders of another establishment', async () => {
      const orders = create();
      await loaded(orders, url, []);

      realtime.orderCreated.set(order('x', { establishmentId: asEstablishmentId('other') }));
      TestBed.tick();

      expect(orders.value()).toEqual([]);
    });

    it('should put a tip on the order and on what is left to pay', async () => {
      const orders = create();
      await loaded(orders, url, [order('a')]);

      realtime.orderTipUpdated.set({ orderId: 'a', tipAmount: 200 });
      TestBed.tick();

      expect(orders.value()?.[0]).toMatchObject({ tipAmount: 200, payableTotal: 1300 });
    });
  });

  describe('orderResource', () => {
    const url = `/establishments/${establishmentId}/orders/a`;

    const create = () =>
      TestBed.runInInjectionContext(() =>
        orderResource(
          signal<EstablishmentId | undefined>(establishmentId),
          signal<OrderId | undefined>(asOrderId('a')),
        ),
      );

    it('should follow its own order and ignore the rest', async () => {
      const current = create();
      await loaded(current, url, order('a'));

      realtime.orderUpdated.set(order('b', { totalAmount: 1 }));
      TestBed.tick();
      expect(current.value()?.totalAmount).toBe(1000);

      realtime.orderUpdated.set(order('a', { totalAmount: 5000 }));
      TestBed.tick();

      expect(current.value()?.totalAmount).toBe(5000);
    });

    it('should mark itself cancelled when someone cancels it', async () => {
      const current = create();
      await loaded(current, url, order('a'));

      realtime.orderCancelled.set({ id: 'a' });
      TestBed.tick();

      expect(current.value()?.status).toBe(OrderStatus.CANCELLED);
    });

    it('should fetch itself again when its discounts change', async () => {
      const current = create();
      await loaded(current, url, order('a'));

      realtime.orderAdjustmentsUpdated.set({ orderId: 'a', adjustments: [] });
      TestBed.tick();

      http.expectOne(url);
    });
  });

  describe('orderHistoryResource', () => {
    const url = `/establishments/${establishmentId}/orders?date=2026-09-24`;

    const create = () =>
      TestBed.runInInjectionContext(() =>
        orderHistoryResource(signal<EstablishmentId | undefined>(establishmentId), signal('2026-09-24')),
      );

    it('should take in orders of the day on screen and leave other days alone', async () => {
      const history = create();
      await loaded(history, url, []);

      realtime.orderCreated.set(order('today'));
      TestBed.tick();
      realtime.orderCreated.set(order('yesterday', { createdAt: '2026-09-23T12:00:00.000Z' }));
      TestBed.tick();

      expect(history.value()?.map((o) => o.id)).toEqual(['today']);
    });
  });
});
