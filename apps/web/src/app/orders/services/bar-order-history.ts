import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BarId, OrderStatus } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';
import { orderArrayMapper } from '../mappers/order.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarOrderHistory {
  readonly #orderRepository = inject(OrderRepository);
  readonly #barId = signal<BarId | undefined>(undefined);
  readonly #date = signal<string>(new Date().toISOString().split('T')[0]);

  readonly #all = httpResource(
    () => {
      const barId = this.#barId();
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

  public readonly totalRevenue = computed(() =>
    this.closedOrders().reduce((sum, o) => sum + o.totalAmount, 0),
  );

  public readonly averageTicket = computed(() => {
    const closed = this.closedOrders();
    if (closed.length === 0) return 0;
    return Math.round(this.totalRevenue() / closed.length);
  });

  public readonly selectedDate = computed(() => this.#date());

  public setBarContext(barId: BarId | undefined) {
    this.#barId.set(barId);
  }

  public setDate(date: string) {
    this.#date.set(date);
  }

  public reload() {
    this.#all.reload();
  }
}
