import { inject, Injectable } from '@angular/core';
import type { BarId, CreateOrderDto } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async execute(barId: BarId, dto: CreateOrderDto): Promise<void> {
    await this.#orderRepository.create(barId, dto);
  }
}
