import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { OrderStatus } from '@coaster/common';
import { BarsStore } from '../../bars';
import { Socket } from '../../core';
import { OrderRepository } from '../data-access/order-repository';
import { orderArrayMapper } from '../mappers/order.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarOrderHistory {
  readonly #orderRepository = inject(OrderRepository);
  readonly #socketService = inject(Socket);
  readonly #barsstore = inject(BarsStore);
  readonly #date = signal<string>(new Date().toISOString().split('T')[0]);

  readonly #all = httpResource(
    () => {
      const barId = this.#barsstore.currentBarId();
      const date = this.#date();
      if (!barId || !date) {
        return undefined;
      }
      return this.#orderRepository.routes.listByDate(barId, date);
    },
    {
      parse: (orders) => orderArrayMapper(orders),
    },
  );

  readonly all = this.#all.asReadonly();

  public readonly closedOrders = computed(
    () => this.#all.value()?.filter((o) => o.status === OrderStatus.CLOSED) ?? [],
  );

  public readonly cancelledOrders = computed(
    () => this.#all.value()?.filter((o) => o.status === OrderStatus.CANCELLED) ?? [],
  );

  public readonly totalOrders = computed(() => this.#all.value()?.length ?? 0);

  public readonly totalClosed = computed(() => this.closedOrders().length);

  public readonly totalCancelled = computed(() => this.cancelledOrders().length);

  public readonly totalRevenue = computed(() => this.closedOrders().reduce((sum, o) => sum + o.totalAmount, 0));

  public readonly averageTicket = computed(() => {
    const closed = this.closedOrders();
    if (closed.length === 0) return 0;
    return Math.round(this.totalRevenue() / closed.length);
  });

  public readonly selectedDate = computed(() => this.#date());

  constructor() {
    // Only update cache if the order belongs to the currently viewed date
    const isTodayOrMatchDate = (dateStr: Date | string | undefined) => {
      if (!dateStr) return false;
      const targetDate = new Date(dateStr).toISOString().split('T')[0];
      return targetDate === this.#date();
    };

    effect(() => {
      const created = this.#socketService.orderCreated();
      if (created && this.#barsstore.currentBarId() === created.barId && isTodayOrMatchDate(created.createdAt)) {
        this.#all.update((orders) => {
          if (!orders) return [created];
          const exists = orders.some((o) => o.id === created.id);
          return exists ? orders : [...orders, created];
        });
      }
    });

    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#barsstore.currentBarId() === updated.barId && isTodayOrMatchDate(updated.createdAt)) {
        this.#all.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === updated.id ? updated : o));
        });
      }
    });

    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#barsstore.currentBarId() === closed.barId && isTodayOrMatchDate(closed.createdAt)) {
        this.#all.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === closed.id ? closed : o));
        });
      }
    });

    effect(() => {
      const cancelled = this.#socketService.orderCancelled();
      if (cancelled) {
        this.#all.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === cancelled.id ? { ...o, status: OrderStatus.CANCELLED } : o));
        });
      }
    });
  }

  public setDate(date: string) {
    this.#date.set(date);
  }

  public reload() {
    this.#all.reload();
  }
}
