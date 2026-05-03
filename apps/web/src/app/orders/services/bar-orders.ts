import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BarId, OrderStatus } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';
import { orderArrayMapper } from '../mappers/order.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarOrders {
  readonly #orderRepository = inject(OrderRepository);
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

  public setBarContext(barId: BarId | undefined) {
    this.#barId.set(barId);
  }

  public reload() {
    this.#all.reload();
  }
}
