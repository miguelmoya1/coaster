import { inject, Service } from '@angular/core';
import type { BarId, OrderId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class DeleteOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async execute(barId: BarId, orderId: OrderId): Promise<void> {
    await this.#orderRepository.deleteOrder(barId, orderId);
  }
}
