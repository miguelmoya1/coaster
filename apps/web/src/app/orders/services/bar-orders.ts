import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Injectable({
  providedIn: 'root',
})
export class BarOrders {
  readonly #orderRepository = inject(OrderRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#orderRepository.routes.list(barId);
  }
}
