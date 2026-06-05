import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class BarOrders {
  readonly #orderRepository = inject(OrderRepository);

  public execute(barId: BarId | undefined, status?: string) {
    if (!barId) {
      return undefined;
    }

    if (status) {
      return this.#orderRepository.routes.listByStatus(barId, status);
    }

    return this.#orderRepository.routes.list(barId);
  }
}
