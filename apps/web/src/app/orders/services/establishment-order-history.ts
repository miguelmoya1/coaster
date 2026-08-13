import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class EstablishmentOrderHistory {
  readonly #orderRepository = inject(OrderRepository);

  public execute(establishmentId: EstablishmentId | undefined, date: string | undefined) {
    if (!establishmentId || !date) {
      return undefined;
    }

    return this.#orderRepository.routes.listByDate(establishmentId, date);
  }
}
