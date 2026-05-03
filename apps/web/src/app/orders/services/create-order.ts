import { inject, Injectable } from '@angular/core';
import { BarId, CreateOrderDto } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async create(barId: BarId, dto: CreateOrderDto) {
    return await this.#orderRepository.create(barId, dto);
  }
}
