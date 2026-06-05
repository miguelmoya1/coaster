import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class BarOrderHistory {
  readonly #orderRepository = inject(OrderRepository);

  public execute(barId: BarId | undefined, date: string | undefined) {
    if (!barId || !date) {
      return undefined;
    }

    return this.#orderRepository.routes.listByDate(barId, date);
  }
}
