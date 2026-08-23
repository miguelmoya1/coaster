import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { EstablishmentId, Order } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { orderArrayMapper } from '../mappers/order.mapper';
import { EstablishmentOrderHistory } from '../services/establishment-order-history';

@Service()
export class OrderHistoryStore {
  readonly #establishmentOrderHistory = inject(EstablishmentOrderHistory);
  readonly #realtime = inject(Realtime);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);
  readonly #historyDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly #historyResource = httpResource(
    () => this.#establishmentOrderHistory.execute(this.#currentEstablishmentId(), this.#historyDate()),
    {
      parse: (orders) => orderArrayMapper(orders),
    },
  );

  public readonly history = this.#historyResource.asReadonly();
  public readonly selectedDate = computed(() => this.#historyDate());

  public readonly closedOrders = computed(
    () => this.#historyResource.value()?.filter((o) => o.status === OrderStatus.CLOSED) ?? [],
  );
  public readonly cancelledOrders = computed(
    () => this.#historyResource.value()?.filter((o) => o.status === OrderStatus.CANCELLED) ?? [],
  );
  public readonly totalOrders = computed(() => this.#historyResource.value()?.length ?? 0);
  public readonly totalClosed = computed(() => this.closedOrders().length);
  public readonly totalCancelled = computed(() => this.cancelledOrders().length);
  public readonly historyTotalRevenue = computed(() => this.closedOrders().reduce((sum, o) => sum + o.orderTotal, 0));
  public readonly averageTicket = computed(() => {
    const closed = this.closedOrders();
    if (closed.length === 0) return 0;
    return Math.round(this.historyTotalRevenue() / closed.length);
  });

  constructor() {
    const isTodayOrMatchDate = (dateStr: Date | string | undefined) => {
      if (!dateStr) return false;
      const targetDate = new Date(dateStr).toISOString().split('T')[0];
      return targetDate === this.#historyDate();
    };

    const upsertOrderIfMatchesDate = (order: Order) => {
      if (!isTodayOrMatchDate(order.createdAt)) return;
      this.#historyResource.update((orders) => {
        if (!orders) return [order];
        const exists = orders.some((o) => o.id === order.id);
        return exists ? orders.map((o) => (o.id === order.id ? order : o)) : [...orders, order];
      });
    };

    effect(() => {
      const created = this.#realtime.orderCreated();
      if (created && this.#currentEstablishmentId() === created.establishmentId) {
        upsertOrderIfMatchesDate(created);
      }
    });

    effect(() => {
      const updated = this.#realtime.orderUpdated();
      if (updated && this.#currentEstablishmentId() === updated.establishmentId) {
        upsertOrderIfMatchesDate(updated);
      }
    });

    effect(() => {
      const closed = this.#realtime.orderClosed();
      if (closed && this.#currentEstablishmentId() === closed.establishmentId) {
        upsertOrderIfMatchesDate(closed);
      }
    });

    effect(() => {
      const cancelled = this.#realtime.orderCancelled();
      if (cancelled) {
        this.#historyResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === cancelled.id ? { ...o, status: OrderStatus.CANCELLED } : o));
        });
      }
    });

    effect(() => {
      const itemAdded = this.#realtime.orderItemAdded();
      if (itemAdded && this.#currentEstablishmentId() === itemAdded.establishmentId) {
        upsertOrderIfMatchesDate(itemAdded);
      }
    });

    effect(() => {
      const deleted = this.#realtime.orderDeleted();
      if (deleted) {
        this.#historyResource.update((orders) => {
          if (!orders) return undefined;
          return orders.filter((o) => o.id !== deleted.id);
        });
      }
    });
  }

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public setHistoryDate(date: string) {
    this.#historyDate.set(date);
  }

  public reloadHistory() {
    this.#historyResource.reload();
  }
}
