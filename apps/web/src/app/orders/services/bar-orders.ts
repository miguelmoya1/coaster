import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { BarId, Order, OrderId, OrderStatus } from '@coaster/common';
import { Socket } from '../../core';
import { OrderRepository } from '../data-access/order-repository';
import { orderArrayMapper } from '../mappers/order.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarOrders {
  readonly #orderRepository = inject(OrderRepository);
  readonly #socketService = inject(Socket);
  readonly #barId = signal<BarId | undefined>(undefined);

  readonly #all = httpResource(
    () => {
      const barId = this.#barId();
      if (!barId) {
        return undefined;
      }
      return this.#orderRepository.routes.list(barId);
    },
    {
      parse: (orders) => orderArrayMapper(orders),
    },
  );

  readonly all = this.#all.asReadonly();

  public readonly openOrders = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.filter((o) => o.status === OrderStatus.OPEN) ?? [];
    }
    return [];
  });

  public readonly totalOpen = computed(() => this.openOrders().length);

  public readonly totalRevenue = computed(() => {
    if (this.#all.hasValue()) {
      return (
        this.#all
          .value()
          ?.filter((o) => o.status === OrderStatus.CLOSED)
          .reduce((sum, o) => sum + o.totalAmount, 0) ?? 0
      );
    }
    return 0;
  });

  constructor() {
    effect(() => {
      const created = this.#socketService.orderCreated();
      if (created && this.#barId() === created.barId) {
        this.#all.update((orders) => {
          if (!orders) return [created];
          const exists = orders.some((o) => o.id === created.id);
          return exists ? orders : [...orders, created];
        });
      }
    });

    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#barId() === updated.barId) {
        this.#all.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === updated.id ? updated : o));
        });
      }
    });

    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#barId() === closed.barId) {
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

  public setBarContext(barId: BarId | undefined) {
    if (this.#barId() !== barId) {
      if (this.#barId()) {
        this.#socketService.leaveBar(this.#barId()!);
      }
      this.#barId.set(barId);
      if (barId) {
        this.#socketService.joinBar(barId);
      }
    }
  }

  public reload() {
    this.#all.reload();
  }

  public optimisticUpdate(orderId: OrderId, updater: (order: Order) => Order): Order | undefined {
    let original: Order | undefined;
    this.#all.update((orders) => {
      if (!orders) return undefined;
      return orders.map((o) => {
        if (o.id === orderId) {
          original = { ...o };
          return updater(o);
        }
        return o;
      });
    });
    return original;
  }

  public revertUpdate(originalOrder: Order | undefined) {
    if (!originalOrder) return;
    this.#all.update((orders) => {
      if (!orders) return undefined;
      return orders.map((o) => (o.id === originalOrder.id ? originalOrder : o));
    });
  }
}
