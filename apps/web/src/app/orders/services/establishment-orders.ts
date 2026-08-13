import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class EstablishmentOrders {
  readonly #orderRepository = inject(OrderRepository);

  public execute(establishmentId: EstablishmentId | undefined, status?: string) {
    if (!establishmentId) {
      return undefined;
    }

    if (status) {
      return this.#orderRepository.routes.listByStatus(establishmentId, status);
    }

    return this.#orderRepository.routes.list(establishmentId);
  }
}
