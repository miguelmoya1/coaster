import { inject, Injectable } from '@angular/core';
import { BarId, OrderId } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Injectable({
  providedIn: 'root',
})
export class DeleteOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async execute(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.deleteOrder(barId, orderId);
  }
}
