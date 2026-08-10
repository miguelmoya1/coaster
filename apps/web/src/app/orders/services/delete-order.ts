import { inject, Service } from '@angular/core';
import type { EstablishmentId, OrderId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class DeleteOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async execute(establishmentId: EstablishmentId, orderId: OrderId): Promise<void> {
    await this.#orderRepository.deleteOrder(establishmentId, orderId);
  }
}
