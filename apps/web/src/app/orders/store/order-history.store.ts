import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId, Order } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { Socket } from '@coaster/core';
import { orderArrayMapper } from '../mappers/order.mapper';
import { BarOrderHistory } from '../services/bar-order-history';

@Service()
export class OrderHistoryStore {
  readonly #barOrderHistory = inject(BarOrderHistory);
  readonly #socketService = inject(Socket);

  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #historyDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly #historyResource = httpResource(
    () => this.#barOrderHistory.execute(this.#currentBarId(), this.#historyDate()),
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

    // Order created
    effect(() => {
      const created = this.#socketService.orderCreated();
      if (created && this.#currentBarId() === created.barId) {
        upsertOrderIfMatchesDate(created);
      }
    });

    // Order updated
    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#currentBarId() === updated.barId) {
        upsertOrderIfMatchesDate(updated);
      }
    });

    // Order closed
    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentBarId() === closed.barId) {
        upsertOrderIfMatchesDate(closed);
      }
    });

    // Order cancelled
    effect(() => {
      const cancelled = this.#socketService.orderCancelled();
      if (cancelled) {
        this.#historyResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === cancelled.id ? { ...o, status: OrderStatus.CANCELLED } : o));
        });
      }
    });

    // Order item added
    effect(() => {
      const itemAdded = this.#socketService.orderItemAdded();
      if (itemAdded && this.#currentBarId() === itemAdded.barId) {
        upsertOrderIfMatchesDate(itemAdded);
      }
    });

    // Order deleted
    effect(() => {
      const deleted = this.#socketService.orderDeleted();
      if (deleted) {
        this.#historyResource.update((orders) => {
          if (!orders) return undefined;
          return orders.filter((o) => o.id !== deleted.id);
        });
      }
    });
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public setHistoryDate(date: string) {
    this.#historyDate.set(date);
  }

  public reloadHistory() {
    this.#historyResource.reload();
  }
}
