import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateOrderDto } from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class CreateOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async execute(establishmentId: EstablishmentId, dto: CreateOrderDto): Promise<void> {
    await this.#orderRepository.create(establishmentId, dto);
  }
}
